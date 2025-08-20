#!/usr/bin/env python3
"""
Backend API Testing for Location Endpoints
Tests the new location import and query endpoints
"""

import requests
import json
import time
import sys
from urllib.parse import quote

# Get backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_BASE = f"{BACKEND_URL}/api"
print(f"Testing backend API at: {API_BASE}")

def test_import_locations():
    """Test POST /api/admin/locations/import with data.gov.in CSV"""
    print("\n=== Testing Location Import ===")
    
    url = f"{API_BASE}/admin/locations/import"
    params = {
        'source': 'remote',
        'url': 'https://www.data.gov.in/files/ogdpv2dms/s3fs-public/dataurl03122020/pincode.csv'
    }
    
    print(f"POST {url}")
    print(f"Params: {params}")
    
    try:
        response = requests.post(url, params=params, timeout=120)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 202]:
            data = response.json()
            if 'imported' in data and 'states' in data and 'cities' in data:
                print(f"✅ Import successful: {data['imported']} locations, {data['states']} states, {data['cities']} cities")
                return True
            else:
                print(f"❌ Import response missing expected fields: {data}")
                return False
        else:
            print(f"❌ Import failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Import request failed: {e}")
        return False

def test_get_states():
    """Test GET /api/locations/states"""
    print("\n=== Testing Get States ===")
    
    url = f"{API_BASE}/locations/states"
    print(f"GET {url}")
    
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            states = response.json()
            print(f"Found {len(states)} states")
            
            if len(states) == 0:
                print("❌ No states found")
                return False
                
            # Check for Uttar Pradesh or similar
            uttar_pradesh_found = False
            for state in states:
                if 'uttar' in state.lower() and 'pradesh' in state.lower():
                    uttar_pradesh_found = True
                    print(f"✅ Found Uttar Pradesh variant: {state}")
                    break
            
            if not uttar_pradesh_found:
                print(f"⚠️  Uttar Pradesh not found. Available states: {states[:10]}...")
                
            print(f"✅ States endpoint working, returned {len(states)} states")
            return True
        else:
            print(f"❌ States request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ States request failed: {e}")
        return False

def test_get_cities():
    """Test GET /api/locations/cities?state=Uttar Pradesh"""
    print("\n=== Testing Get Cities ===")
    
    # URL encode the state parameter
    state_param = quote("Uttar Pradesh")
    url = f"{API_BASE}/locations/cities?state={state_param}"
    print(f"GET {url}")
    
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            cities = response.json()
            print(f"Found {len(cities)} cities for Uttar Pradesh")
            
            if len(cities) == 0:
                print("❌ No cities found for Uttar Pradesh")
                return False
                
            print(f"Sample cities: {cities[:5]}")
            print(f"✅ Cities endpoint working, returned {len(cities)} cities")
            return True
        else:
            print(f"❌ Cities request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Cities request failed: {e}")
        return False

def test_search_locations():
    """Test GET /api/locations/search?term=luck"""
    print("\n=== Testing Location Search ===")
    
    url = f"{API_BASE}/locations/search?term=luck"
    print(f"GET {url}")
    
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Search results: {data}")
            
            if 'states' not in data or 'cities' not in data:
                print("❌ Search response missing 'states' or 'cities' fields")
                return False
                
            states = data['states']
            cities = data['cities']
            
            # Look for Lucknow in cities
            lucknow_found = False
            for city in cities:
                if 'lucknow' in city.lower():
                    lucknow_found = True
                    print(f"✅ Found Lucknow: {city}")
                    break
                    
            if not lucknow_found:
                print(f"⚠️  Lucknow not found in search results")
                print(f"States found: {states}")
                print(f"Cities found: {cities}")
                
            total_results = len(states) + len(cities)
            if total_results > 0:
                print(f"✅ Search endpoint working, returned {len(states)} states and {len(cities)} cities")
                return True
            else:
                print("❌ Search returned no results")
                return False
        else:
            print(f"❌ Search request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Search request failed: {e}")
        return False

def main():
    """Run all location endpoint tests"""
    print("Starting Backend Location Endpoints Testing")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Import locations
    results['import'] = test_import_locations()
    
    # Wait a moment for import to complete
    if results['import']:
        print("\nWaiting 3 seconds for import to complete...")
        time.sleep(3)
    
    # Test 2: Get states
    results['states'] = test_get_states()
    
    # Test 3: Get cities for Uttar Pradesh
    results['cities'] = test_get_cities()
    
    # Test 4: Search locations
    results['search'] = test_search_locations()
    
    # Summary
    print("\n" + "=" * 50)
    print("BACKEND TESTING SUMMARY")
    print("=" * 50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All location endpoint tests PASSED!")
        return True
    else:
        print("⚠️  Some location endpoint tests FAILED!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)