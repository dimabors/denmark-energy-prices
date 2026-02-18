#!/usr/bin/env python3
"""
Script to fetch and parse Egedal Fjernvarme prices from their PDF.
Run periodically via GitHub Actions to keep prices updated.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
    import pdfplumber
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "pdfplumber"])
    import requests
    import pdfplumber

CONFIG_PATH = Path(__file__).parent.parent / "config" / "prices.json"
EGEDAL_PDF_URL_TEMPLATE = "https://www.egedalfjernvarme.dk/media/lusn3u05/takstblad-{year}.pdf"

def fetch_pdf(url: str) -> bytes:
    """Download PDF from URL."""
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content

def extract_variable_price(pdf_content: bytes) -> float | None:
    """Extract variable energy price from Egedal Fjernvarme PDF."""
    import io
    
    with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                # Look for patterns like "Variabel energipris" followed by a number
                # Common patterns: "485,00 kr./MWh" or "485 kr/MWh"
                patterns = [
                    r'[Vv]ariabel\s+energipris[^0-9]*(\d+[,.]?\d*)\s*kr',
                    r'[Ee]nergipris[^0-9]*(\d+[,.]?\d*)\s*kr[./]*MWh',
                    r'(\d+[,.]?\d*)\s*kr[./]*MWh',
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, text)
                    if match:
                        price_str = match.group(1).replace(',', '.')
                        return float(price_str)
                
                # Also try extracting from tables
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        row_text = ' '.join(str(cell) for cell in row if cell)
                        if 'variabel' in row_text.lower() or 'energipris' in row_text.lower():
                            # Find number in this row
                            numbers = re.findall(r'(\d+[,.]?\d*)', row_text)
                            for num_str in numbers:
                                num = float(num_str.replace(',', '.'))
                                if 100 < num < 2000:  # Reasonable MWh price range
                                    return num
    
    return None

def update_prices():
    """Main function to update prices config."""
    current_year = datetime.now().year
    
    # Load existing config
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    else:
        config = {"fjernvarme": {}, "gas": {}, "water": {}}
    
    # Try to fetch Egedal PDF for current year
    pdf_url = EGEDAL_PDF_URL_TEMPLATE.format(year=current_year)
    print(f"Fetching PDF from: {pdf_url}")
    
    try:
        pdf_content = fetch_pdf(pdf_url)
        variable_price = extract_variable_price(pdf_content)
        
        if variable_price:
            print(f"Found variable price: {variable_price} DKK/MWh")
            
            config["lastUpdated"] = datetime.now().strftime("%Y-%m-%d")
            config["fjernvarme"]["egedal"] = {
                "name": "Egedal Fjernvarme",
                "source": "https://www.egedalfjernvarme.dk/priser/",
                "pdfUrl": pdf_url,
                "year": current_year,
                "prices": {
                    "variablePris": variable_price,
                    "unit": "DKK/MWh",
                    "note": "Variable energipris inkl. moms"
                }
            }
            
            # Save updated config
            with open(CONFIG_PATH, 'w') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print(f"Updated {CONFIG_PATH}")
            return True
        else:
            print("Could not extract variable price from PDF")
            return False
            
    except requests.exceptions.HTTPError as e:
        print(f"Failed to fetch PDF: {e}")
        # Try previous year as fallback
        if current_year > 2026:
            pdf_url = EGEDAL_PDF_URL_TEMPLATE.format(year=current_year - 1)
            print(f"Trying previous year: {pdf_url}")
            # ... could recurse here
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = update_prices()
    sys.exit(0 if success else 1)
