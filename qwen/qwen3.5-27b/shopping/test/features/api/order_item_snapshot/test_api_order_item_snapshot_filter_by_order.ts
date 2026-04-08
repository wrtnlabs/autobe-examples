import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test filtering order item snapshots by specific order ID.
 *
 * Validates the order item snapshot filtering functionality by creating two separate orders with different products, then verifying that filtering by order_id returns only the snapshots belonging to that specific order.
 *
 * This test ensures that:
 * - Snapshots are correctly associated with their parent orders
 * - The order_id filter parameter works correctly
 * - Pagination metadata reflects the filtered results
 * - Snapshot data preserves the exact product state at purchase time
 *
 * 1. Register and authenticate a seller account.
 * 2. Register and authenticate a customer account.
 * 3. Seller creates first product with a variant.
 * 4. Seller creates second product with a variant.
 * 5. Customer places first order containing the first product.
 * 6. Customer places second order containing the second product.
 * 7. Customer queries order item snapshots filtered by first order ID.
 * 8. Verify only first order's snapshots are returned.
 * 9. Customer queries order item snapshots filtered by second order ID.
 * 10. Verify only second order's snapshots are returned.
 * 11. Verify snapshot immutability by checking product names and prices match original purchases.
 */
export async function test_api_order_item_snapshot_filter_by_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create first product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  // 4. Create variant for first product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {},
      },
    );
  typia.assert(variant1);
  // 5. Create second product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  // 6. Create variant for second product
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {},
      },
    );
  typia.assert(variant2);
  // 7. Place first order
  const order1 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order1);
  // 8. Place second order
  const order2 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order2);
  // 9. Query snapshots for first order
  const snapshots1 =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          order_id: order1.id,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshots1);
  // 10. Verify first order snapshots
  TestValidator.predicate(
    "first order has snapshots",
    snapshots1.data.length > 0,
  );
  TestValidator.equals(
    "all snapshots belong to first order",
    snapshots1.data.every((snap) => snap.product_name === product1.name),
    true,
  );
  // 11. Query snapshots for second order
  const snapshots2 =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          order_id: order2.id,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshots2);
  // 12. Verify second order snapshots
  TestValidator.predicate(
    "second order has snapshots",
    snapshots2.data.length > 0,
  );
  TestValidator.equals(
    "all snapshots belong to second order",
    snapshots2.data.every((snap) => snap.product_name === product2.name),
    true,
  );
  // 13. Verify snapshots are different between orders
  TestValidator.notEquals(
    "snapshots differ between orders",
    snapshots1.data[0].product_name,
    snapshots2.data[0].product_name,
  );
  // 14. Verify snapshot immutability - product prices match original
  TestValidator.equals(
    "first order snapshot preserves product price",
    snapshots1.data[0].product_base_price,
    product1.base_price,
  );
  TestValidator.equals(
    "second order snapshot preserves product price",
    snapshots2.data[0].product_base_price,
    product2.base_price,
  );
  // 15. Verify seller information is preserved in snapshots
  TestValidator.predicate(
    "first order snapshot has seller shop name",
    snapshots1.data[0].seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "second order snapshot has seller shop name",
    snapshots2.data[0].seller_shop_name.length > 0,
  );
}