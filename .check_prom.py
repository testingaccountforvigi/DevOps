import urllib.request, json, sys

base = "http://127.0.0.1:51097"

# Check targets
with urllib.request.urlopen(base + "/api/v1/targets") as r:
    d = json.load(r)
print("=== TARGETS ===")
for t in d['data']['activeTargets']:
    print(t['labels'].get('job','?'), '|', t['health'], '|', t['scrapeUrl'])

# Check metric names
with urllib.request.urlopen(base + "/api/v1/label/__name__/values") as r:
    d = json.load(r)
names = d['data']
loanpro = [n for n in names if 'loanpro' in n]
print("\n=== TOTAL METRICS:", len(names), "===")
print("\nLoanPro metrics (" + str(len(loanpro)) + "):")
for n in loanpro:
    print(" ", n)
