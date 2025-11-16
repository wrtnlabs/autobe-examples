import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an admin can soft erase (delete) an order item.
 *
 * 1. Register as new admin for admin authentication
 * 2. Create an order item under a random orderNumber
 * 3. Confirm order item exists, with expected fields
 * 4. Erase the order item (soft delete)
 * 5. Assert that 'deleted_at' field is set
 * 6. Optionally, check order summary or related effects, if accessible
 * 7. Assert that the item is flagged as deleted on retrieval, if possible
 */
export async function test_api_order_item_erasure_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Generate random order number
  const orderNumber = RandomGenerator.alphaNumeric(12).toUpperCase();

  // 3. Create dummy order item
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderItemInit = {
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: skuId,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    unit_price: typia.random<number>(),
    subtotal: 1 * typia.random<number>(),
    currency: "KRW",
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;
  const item: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderNumber,
      body: orderItemInit,
    });
  typia.assert(item);

  // 4. Confirm order item exists and initial deleted_at is null/undefined
  TestValidator.equals(
    "order item deleted_at should be null or undefined on creation",
    item.deleted_at,
    null,
  );

  // 5. Erase (soft delete) the order item
  const erased: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.erase(connection, {
      orderNumber,
      orderItemId: item.id,
    });
  typia.assert(erased);
  TestValidator.predicate(
    "order item deleted_at is set after soft delete",
    typeof erased.deleted_at === "string" && erased.deleted_at.length > 0,
  );
  TestValidator.equals(
    "order item ID remains unchanged after erase",
    erased.id,
    item.id,
  );
  TestValidator.equals(
    "parent orderNumber is unchanged",
    erased.order.order_number,
    item.order.order_number,
  );
}
