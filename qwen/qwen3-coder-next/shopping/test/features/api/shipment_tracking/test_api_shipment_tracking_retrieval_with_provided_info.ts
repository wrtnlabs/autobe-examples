import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipment_tracking_retrieval_with_provided_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  // Store credentials for later use
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminInfo = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminInfo);
  // 2. Login as admin
  await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  // 3. Create a shipment with tracking info
  // Note: Shipment creation endpoint is not available in the provided SDK
  // For testing purposes, we'll use a valid UUID as a placeholder
  // In a real scenario, a shipment would be created first
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve tracking information
  const trackingInfo =
    await api.functional.ecommerceMall.admin.shipments.tracking.at(
      adminConnection,
      {
        shipmentId,
      },
    );
  typia.assert(trackingInfo);
  // 5. Validate tracking info
  TestValidator.equals(
    "carrier name",
    trackingInfo.carrier_name,
    "Kuroneko Yamato",
  );
  TestValidator.equals(
    "tracking number",
    trackingInfo.tracking_number,
    "123456789",
  );
}
