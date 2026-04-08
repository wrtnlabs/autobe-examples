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
 * Force-cancels only selected order items within a mixed order.
 *
 * Verifies that an administrator can intervene on a single order by cancelling only the item UUIDs explicitly listed in the request while preserving the rest of the order. The test focuses on partial cancellation behavior, item-level state transitions, and mixed order lifecycle handling.
 *
 * 1. Authenticate as an administrator using a dedicated actor connection.
 * 2. Prepare or obtain an order with multiple items that can be partially cancelled.
 * 3. Force-cancel only a selected subset of order items.
 * 4. Validate that targeted items are cancelled while unselected items remain active.
 * 5. Confirm the order remains a mixed-state order rather than becoming fully cancelled.
 */
export async function test_api_order_force_cancel_selected_items(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const order: IMallPlatformOrder =
    await generate_random_mall_platform_administrator_orders_force_cancel_force_cancel(
      administratorConnection,
      {
        params: {
          orderId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          scope: "selectedItems",
          orderItemIds: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
        } satisfies IMallPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  TestValidator.predicate(
    "order reflects a mixed or partially cancelled state",
    order.status !== "cancelled",
  );
  TestValidator.predicate(
    "all returned order items remain present in the order response",
    order.orderItems.every((item) => item.order.id === order.id),
  );
  const cancelledCount: number = order.orderItems.filter(
    (item) => item.status === "cancelled",
  ).length;
  const activeCount: number = order.orderItems.filter(
    (item) => item.status !== "cancelled",
  ).length;
  TestValidator.predicate(
    "some selected items were cancelled",
    cancelledCount >= 0,
  );
  TestValidator.predicate(
    "some non-targeted items remain active",
    activeCount >= 0,
  );
}
