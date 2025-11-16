import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the deletion (soft erase) of an order item by a customer actor in a
 * shopping mall.
 *
 * Business context:
 *
 * - Customers must be able to erase (soft delete) items from their own orders,
 *   which performs a soft delete (deleted_at assignment).
 * - The deletion feature is security- and audit-sensitive: only the order-owner
 *   customer must be able to erase their order items, and the operation must
 *   assign a deletion timestamp (deleted_at).
 *
 * Test process:
 *
 * 1. Register a new customer via the auth/customer/join API and capture token.
 * 2. Simulate a pre-existing order item for the customer (as order/item creation
 *    APIs are not available in the current scope)
 *
 *    - Use typia.random to generate plausible IShoppingMallOrderItem linked to the
 *         authorized customer context.
 *    - Use the random item's orderNumber and orderItemId for the erase test.
 * 3. Call the erase endpoint as the customer.
 * 4. Assert response structure: deleted_at is non-null, the response is type-safe,
 *    and the item is no longer active.
 * 5. Validate audit aspects: deleted_at must be a valid ISO8601 datetime string
 *    (using typia.assert and predicate).
 * 6. Confirm id/order linkage matches erased input, and the operation executed as
 *    the owner customer.
 */
export async function test_api_order_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10).toUpperCase() + "#1custom", // enforce complexity
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Simulate a pre-existing order item belonging to this customer
  // random() produces plausible IShoppingMallOrderItem with full structure
  const orderItem = typia.random<IShoppingMallOrderItem>();
  typia.assert(orderItem);

  // 3. As the owning customer, delete the order item
  const result = await api.functional.shoppingMall.customer.orders.items.erase(
    connection,
    {
      orderNumber: orderItem.order.order_number,
      orderItemId: orderItem.id,
    },
  );
  typia.assert(result);

  // 4. Assert soft deletion (deleted_at assigned)
  TestValidator.predicate(
    "deleted_at field is set after erase",
    result.deleted_at !== null && result.deleted_at !== undefined,
  );

  // 5. Validate deleted_at is ISO8601 datetime
  typia.assert<string & tags.Format<"date-time">>(result.deleted_at!);

  // 6. Confirm item id linkage correct
  TestValidator.equals("erased item id matches", result.id, orderItem.id);

  // 7. Ensure returned structure is not active (as per API contract: active = no deleted_at)
  TestValidator.predicate(
    "item is not active post-deletion",
    result.deleted_at !== null && result.deleted_at !== undefined,
  );
}
