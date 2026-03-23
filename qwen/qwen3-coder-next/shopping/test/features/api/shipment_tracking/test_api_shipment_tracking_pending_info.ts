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

export async function test_api_shipment_tracking_pending_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection with valid credentials from scenario plan
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEcommerceMallAdmin.ILogin = {
    email: "admin@test.com",
    password: "1234",
  };
  // 2. Login as admin to obtain authentication token
  const authorizedAdmin = await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorizedAdmin);
  // 3. Get shipment tracking with pending (empty/null) tracking information
  const shipmentId = "00000000-0000-0000-0000-000000000000";
  const trackingInfo =
    await api.functional.ecommerceMall.admin.shipments.tracking.at(
      adminConnection,
      {
        shipmentId,
      },
    );
  typia.assert(trackingInfo);
  // 4. Validate response contains pending tracking information (null values)
  TestValidator.equals("carrier_name is null", trackingInfo.carrier_name, null);
  TestValidator.equals(
    "tracking_number is null",
    trackingInfo.tracking_number,
    null,
  );
}
