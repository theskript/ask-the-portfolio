@description('Name of the Static Web App.')
param name string = 'ask-the-portfolio'

@description('Free-tier Static Web Apps are available in a limited set of regions.')
@allowed([
  'westus2'
  'centralus'
  'eastus2'
  'westeurope'
  'eastasia'
])
param location string = 'eastus2'

resource site 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// The serverless bundle cannot load the native embedding runtime, so search runs lexically in Azure.
// The language-model key is deliberately not set here; add it as an application setting after deployment.
resource settings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: site
  name: 'appsettings'
  properties: {
    NUXT_RETRIEVAL: 'lexical'
  }
}

output hostname string = site.properties.defaultHostname
