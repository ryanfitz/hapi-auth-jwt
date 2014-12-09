default: jshint test

jshint:
	@grunt
test:
	@node node_modules/lab/bin/lab
test-cov: 
	@node node_modules/lab/bin/lab -t 100
test-cov-html:
	@node node_modules/lab/bin/lab -r html -o coverage.html
complexity:
	@node node_modules/complexity-report/src/cli.js -o complexity.md -f markdown lib

.PHONY: test test-cov test-cov-html complexity

