import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_order_items_refund_create } from "../../../generate/generate_random_shopping_mall_admin_order_items_refund_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that admin force-refund is rejected when the order item does not have DELIVERED status.
 *
 * This test validates the business rule that only DELIVERED order items are eligible for refund.
 * The test performs the following steps:
 * 1. Authenticates as administrator using admin join endpoint
 * 2. Retrieves an order item with PAID or SHIPPED status (not yet delivered)
 * 3. Attempts to submit a refund request with valid reason text
 * 4. Verifies the request fails with business logic error indicating item status ineligibility
 *
 * This prevents refunds for items still in transit or awaiting shipment, ensuring proper
 * order fulfillment workflow is maintained.
 */
export async function test_api_order_item_refund_admin_invalid_item_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve an order item with non-DELIVERED status (PAID or SHIPPED)
  // Note: Test assumes pre-existing fixture data with order items in various statuses
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.shoppingMall.admin.orders.items.at(
    adminConnection,
    {
      orderId,
      itemId,
    },
  );
  typia.assert(orderItem);
  // 3. Verify the order item status is not DELIVERED (should be PAID or SHIPPED)
  TestValidator.predicate(
    "order item status is not DELIVERED",
    () => orderItem.status !== "DELIVERED",
  );
  // 4. Attempt to submit refund request - should fail for non-DELIVERED items
  await TestValidator.error(
    "refund rejected for non-DELIVERED item",
    async () => {
      await api.functional.shoppingMall.admin.order_items.refund.create(
        adminConnection,
        {
          orderItemId: orderItem.id,
          body: {
            order_item_id: orderItem.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
}
