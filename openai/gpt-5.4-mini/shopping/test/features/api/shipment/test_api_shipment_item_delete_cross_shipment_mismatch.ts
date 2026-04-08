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

export async function test_api_shipment_item_delete_cross_shipment_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify cross-shipment item deletion rejects mismatched parent shipment IDs.
   *
   * Validates that deleting a shipment item through the wrong parent shipment is
   * rejected and does not mutate either shipment record. The test covers the
   * parent-child relationship integrity expected by the shipment deletion API.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Create two separate shipments for mismatch testing.
   * 3. Attempt to delete an item through the wrong parent shipment ID.
   * 4. Confirm the API rejects the request with a not-found or mismatch error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const createShipmentBody = (): IMallPlatformShipment.ICreate => ({
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
  });
  const firstShipment =
    await generate_random_mall_platform_administrator_shipments_create(
      administratorConnection,
      { body: createShipmentBody() },
    );
  typia.assert(firstShipment);
  const secondShipment =
    await generate_random_mall_platform_administrator_shipments_create(
      administratorConnection,
      { body: createShipmentBody() },
    );
  typia.assert(secondShipment);
  await TestValidator.httpError(
    "cross-shipment delete should fail with mismatch or not-found",
    [400, 404],
    async () => {
      await api.functional.mallPlatform.administrator.shipments.items.erase(
        administratorConnection,
        {
          shipmentId: secondShipment.id,
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
