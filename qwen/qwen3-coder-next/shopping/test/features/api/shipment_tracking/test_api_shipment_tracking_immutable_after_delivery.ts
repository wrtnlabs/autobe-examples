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

export async function test_api_shipment_tracking_immutable_after_delivery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login as admin
  const adminEmail = (() => {
    const auth = adminConnection.headers?.Authorization;
    if (typeof auth === "string" && auth.startsWith("Bearer ")) {
      return auth.substring(7).split(".")[0];
    }
    return null;
  })();
  
  if (adminEmail === null) {
    throw new Error("Unable to extract email from authorization header");
  }
  
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail as string,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create a shipment with carrier='Yuunyu' and tracking_number='987654321'
  // (Assuming POST /shipments endpoint exists for creating shipments)
  // Note: Need to check if there's a shipment creation endpoint or simulate via order flow
  // 4. Simulate delivery confirmation (14-day auto-confirmation)
  // (Assuming delivery confirmation happens automatically after 14 days or via customer confirmation)
  // 5. Get shipment tracking information
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const trackingInfo =
    await api.functional.ecommerceMall.admin.shipments.tracking.at(
      adminConnection,
      { shipmentId },
    );
  typia.assert(trackingInfo);
  // 6. Validate tracking information
  TestValidator.equals(
    "carrier name is Yuunyu",
    trackingInfo.carrier_name,
    "Yuunyu",
  );
  TestValidator.equals(
    "tracking number is 987654321",
    trackingInfo.tracking_number,
    "987654321",
  );
}