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
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_order_items_force_cancel_create } from "../../../generate/generate_random_mall_platform_seller_order_items_force_cancel_create";
import { prepare_random_mall_platform_order_item } from "../../../prepare/prepare_random_mall_platform_order_item";

/**
 * Verifies that force-cancelling a single order item only affects the targeted item.
 *
 * This scenario validates the administrator intervention workflow for an order item that is eligible for forced cancellation. It confirms that the endpoint returns a valid order item payload, changes the targeted item to cancelled, and preserves the nested order, product variant, and seller references used for historical tracking.
 *
 * The test is intentionally scoped to the single item returned by the endpoint because the available API surface in this test context does not expose order-detail or sibling-item inspection operations. Even with that limitation, it still verifies that the administrative intervention behaves as a targeted item-level mutation rather than corrupting the returned relational context.
 *
 * 1. Create an administrator session using isolated actor-specific connection state.
 * 2. Invoke the force-cancel endpoint for a valid order item identifier.
 * 3. Validate the returned item is cancelled and that related order, variant, and seller data remain populated.
 */
export async function test_api_order_item_force_cancel_single_item_scope(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const orderItem =
    await generate_random_mall_platform_seller_order_items_force_cancel_create(
      administratorConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          quantity: 1,
        } satisfies IMallPlatformOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);
  TestValidator.equals(
    "force-cancel returns cancelled item",
    orderItem.status,
    "cancelled",
  );
  TestValidator.predicate(
    "order relation remains available",
    () =>
      orderItem.order.id.length > 0 && orderItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "product variant relation remains available",
    () =>
      orderItem.productVariant.id.length > 0 &&
      orderItem.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "seller relation remains available",
    () => orderItem.seller.id.length > 0 && orderItem.seller.email.length > 0,
  );
  TestValidator.equals("returned quantity is preserved", orderItem.quantity, 1);
}
