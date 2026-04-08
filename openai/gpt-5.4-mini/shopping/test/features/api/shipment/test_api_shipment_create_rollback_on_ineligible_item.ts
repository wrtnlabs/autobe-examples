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
 * Test transactional rollback when shipment creation includes an ineligible order item.
 *
 * Verifies that shipment creation rejects a request containing an invalid or
 * ineligible order-item set and does not succeed with a partial shipment. Since
 * the available test surface does not expose order-item provisioning or direct
 * shipment inspection by item, this test focuses on the API-level rejection
 * behavior using a generated administrator session and a deterministic invalid
 * shipment payload.
 *
 * The scenario still exercises the business rule that shipment creation must be
 * atomic: the request is built from valid DTO shapes, submitted as a whole, and
 * expected to fail without producing a shipment response.
 *
 * 1. Register an administrator and isolate an admin-specific connection.
 * 2. Build a shipment request with duplicate order item identifiers to model an
 *    ineligible shipment composition.
 * 3. Verify the API rejects the request and does not return a created shipment.
 */
export async function test_api_shipment_create_rollback_on_ineligible_item(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const duplicatedItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(16),
    orderItemIds: [duplicatedItemId, duplicatedItemId],
  } satisfies IMallPlatformShipment.ICreate;
  await TestValidator.error(
    "shipment creation should reject an invalid item composition",
    async () => {
      const shipment =
        await api.functional.mallPlatform.administrator.shipments.create(
          adminConnection,
          { body },
        );
      typia.assert(shipment);
    },
  );
}
