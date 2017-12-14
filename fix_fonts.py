# Run once on Vexflow code to fix imports to end with .js

import glob
import re
import pdb

for filename in glob.iglob('src/lib/third_party/vexflow/*.js'):
  contents = open(filename).read()
  if 'import { Font }' in contents:
    print filename
