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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_orders_force_cancel_force_cancel } from "../../../generate/generate_random_mall_platform_administrator_orders_force_cancel_force_cancel";
import { prepare_random_mall_platform_order } from "../../../prepare/prepare_random_mall_platform_order";

/**
 * Test atomic rollback for administrator force-cancel when a selected target is ineligible.
 *
 * Verifies that administrator intervention on an order does not partially commit when `selectedItems` includes an item that violates cancellation eligibility. The test concentrates on the negative business rule path for the administrator force-cancel endpoint and ensures the operation is rejected instead of succeeding partially.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Submit a force-cancel request with `scope: "selectedItems"` containing multiple target item ids.
 * 3. Include an ineligible target item id in the selection so the request must be rejected.
 * 4. Confirm the operation fails through the test validator, demonstrating that a mixed-eligibility batch is not accepted.
 */
export async function test_api_order_force_cancel_atomic_rollback_ineligible_target(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ineligibleItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const eligibleItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "force-cancel should reject a selectedItems batch containing an ineligible target",
    async () => {
      await generate_random_mall_platform_administrator_orders_force_cancel_force_cancel(
        administratorConnection,
        {
          params: { orderId },
          body: {
            scope: "selectedItems",
            orderItemIds: [eligibleItemId, ineligibleItemId],
          } satisfies IMallPlatformOrder.ICreate,
        },
      );
    },
  );
}
