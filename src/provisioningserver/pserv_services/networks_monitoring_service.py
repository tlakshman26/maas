# Copyright 2016 Canonical Ltd.  This software is licensed under the
# GNU Affero General Public License version 3 (see the file LICENSE).

"""Networks monitoring service for rack controllers."""

__all__ = [
    "RackNetworksMonitoringService",
]

from provisioningserver.logger.log import get_maas_logger
from provisioningserver.rpc.region import UpdateInterfaces
from provisioningserver.utils.services import NetworksMonitoringService


maaslog = get_maas_logger("networks.monitor")


class RackNetworksMonitoringService(NetworksMonitoringService):
    """Rack service to monitor network interfaces for configuration changes."""

    def __init__(self, clientService, reactor):
        super(RackNetworksMonitoringService, self).__init__(reactor)
        self.clientService = clientService

    def recordInterfaces(self, interfaces):
        """Record the interfaces information."""
        client = self.clientService.getClient()
        return client(
            UpdateInterfaces, system_id=client.localIdent,
            interfaces=interfaces)
