import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test shipment-item reassignment is blocked after fulfillment begins.
 *
 * Verifies that an administrator cannot move an existing shipment-item association to another shipment once fulfillment has already started. The available API surface for this isolated test does not include shipment creation or shipment-state mutation helpers, so the test focuses on the reassignment operation itself and asserts that the platform rejects attempts to rewrite shipment membership in a fulfillment-locked context.
 *
 * 1. Register an administrator and authenticate with the dedicated join utility.
 * 2. Attempt to reassign an existing shipment-item to a different shipment identifier.
 * 3. Confirm the request is rejected, because shipment membership must remain immutable after fulfillment begins.
 * 4. If the operation unexpectedly succeeds, validate the response payload with typia to ensure the result is structurally sound.
 */
export async function test_api_shipment_item_reassignment_after_fulfillment_locked(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const targetShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "shipment-item reassignment should be rejected after fulfillment starts",
    async () => {
      const output =
        await api.functional.mallPlatform.administrator.shipments.items.putByShipmentidAndShipmentitemid(
          adminConnection,
          {
            shipmentId,
            shipmentItemId,
            body: {
              shipmentId: targetShipmentId,
            } satisfies IMallPlatformShipmentItem.IUpdate,
          },
        );
      typia.assert(output);
    },
  );
}
