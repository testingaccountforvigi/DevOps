import xml.sax.saxutils as sax

with open('/Users/vigilant/Documents/Aas/DevopsExam/loan-organisation-system/Jenkinsfile', 'r') as f:
    content = f.read()

escaped = sax.escape(content)

config = ('<?xml version="1.0" encoding="UTF-8"?>\n'
'<flow-definition plugin="workflow-job">\n'
'  <description>LoanPro DevOps Pipeline - Build images, load to Minikube, deploy to K8s</description>\n'
'  <keepDependencies>false</keepDependencies>\n'
'  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">\n'
'    <script>' + escaped + '</script>\n'
'    <sandbox>true</sandbox>\n'
'  </definition>\n'
'  <triggers/>\n'
'  <disabled>false</disabled>\n'
'</flow-definition>\n')

out = '/Users/vigilant/Documents/Aas/DevopsExam/loan-organisation-system/.jenkins-job-config.xml'
with open(out, 'w') as f:
    f.write(config)

print('Written', len(config), 'chars to', out)
