import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

/**
 * Verify that an administrator can delete an active shipment.
 *
 * This test validates the administrative shipment deletion workflow by authenticating
 * a dedicated administrator, creating a shipment through the available shipment creation
 * utility, and deleting that shipment through the administrator delete endpoint.
 *
 * 1. Authenticate a dedicated administrator connection.
 * 2. Create a shipment that is eligible for deletion.
 * 3. Delete the created shipment using the administrator shipment deletion endpoint.
 */
export async function test_api_shipment_delete_active_shipment(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await generate_random_mall_platform_administrator_shipments_create(
      administratorConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          trackingUrl: null,
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  await api.functional.mallPlatform.administrator.shipments.erase(
    administratorConnection,
    {
      shipmentId: shipment.id,
    },
  );
}
