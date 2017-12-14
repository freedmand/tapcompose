# Run once on Vexflow code to fix imports to end with .js

import glob
import re
import pdb

def replace(s):
  if not s.group(1).endswith('.js'): return s.group(0)[:-2] + ".js';"
  return s.group(0)

for filename in glob.iglob('src/lib/third_party/vexflow/*.js'):
  contents = open(filename).read()
  newContents = re.sub("import \{[^\}]+\} from '([^']+)';", replace, contents)
  open(filename, 'w').write(newContents)
