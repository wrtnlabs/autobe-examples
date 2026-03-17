import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that order detail preserves historical product snapshots even after product changes.
 *
 * This test validates the snapshot integrity system that captures product state at order time.
 * When a customer places an order, the system creates immutable snapshots of the product
 * and variant state. These snapshots preserve the exact product name, price, and configuration
 * as they were at the moment of purchase, ensuring order history remains accurate even if
 * the seller later modifies the product.
 *
 * Test Flow:
 * 1. Register a new customer account
 * 2. Register a seller account
 * 3. Seller creates a product with specific name and base price
 * 4. Customer creates an order (using generate_random utility which handles cart internally)
 * 5. Seller modifies the product (change name and base price)
 * 6. Customer retrieves order detail
 *
 * Validation:
 * - productSnapshot contains the original product name at order time
 * - productSnapshot contains the original base_price at order time
 * - Current product shows updated information (different from snapshot)
 * - Order total price matches the price paid at checkout
 */
export async function test_api_order_detail_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Register seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create seller connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Seller creates product with specific configuration
  const productName = `Test Product ${RandomGenerator.alphabets(8)}`;
  const productBasePrice = 50000;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: productBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Capture original product details for snapshot comparison
  const originalProductName = product.name;
  const originalProductBasePrice = product.base_price;
  // 4. Customer creates order using the product
  // Note: generate_random utility handles cart population internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Capture original order total for validation
  const originalTotalPrice = order.total_price;
  // 5. Seller modifies the product (change name and price)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${originalProductName} - UPDATED`,
        basePrice: originalProductBasePrice + 10000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Verify product was actually updated
  TestValidator.notEquals(
    "product name changed",
    updatedProduct.name,
    originalProductName,
  );
  TestValidator.notEquals(
    "product price changed",
    updatedProduct.base_price,
    originalProductBasePrice,
  );
  // 6. Retrieve order detail - should contain historical snapshots
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(orderDetail);
  // 7. Validate snapshot integrity
  TestValidator.predicate("order has items", orderDetail.items.length > 0);
  const orderItem = orderDetail.items[0];
  // Validate product snapshot preserves original name
  TestValidator.equals(
    "product snapshot preserves original name",
    orderItem.productSnapshot.name,
    originalProductName,
  );
  // Validate product snapshot preserves original base price
  TestValidator.equals(
    "product snapshot preserves original base price",
    orderItem.productSnapshot.base_price,
    originalProductBasePrice,
  );
  // Validate order total matches original price paid
  TestValidator.equals(
    "order total matches original price",
    orderDetail.total_price,
    originalTotalPrice,
  );
  // Validate current product shows updated information (different from snapshot)
  TestValidator.notEquals(
    "current product name differs from snapshot",
    updatedProduct.name,
    orderItem.productSnapshot.name,
  );
  TestValidator.notEquals(
    "current product price differs from snapshot",
    updatedProduct.base_price,
    orderItem.productSnapshot.base_price,
  );
}
