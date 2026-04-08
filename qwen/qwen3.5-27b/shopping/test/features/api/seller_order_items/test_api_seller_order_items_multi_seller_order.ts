import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test multi-seller order isolation where each seller can only view their own order items.
 *
 * Validates that in a multi-seller order scenario, each seller can only access their own order items when querying the order items endpoint. This ensures proper data isolation and access control in a marketplace where multiple sellers can have items in the same customer order.
 *
 * The test creates two separate sellers with their own products, then has a customer place a single order containing items from both sellers. Each seller then queries the order items endpoint to verify they only see items from their own products, not the other seller's items.
 *
 * 1. Register and authenticate seller A with random credentials.
 * 2. Seller A creates a product with name, description, and base price.
 * 3. Seller A creates a product variant with SKU code, options, and initial stock.
 * 4. Register and authenticate seller B with random credentials.
 * 5. Seller B creates a product with name, description, and base price.
 * 6. Seller B creates a product variant with SKU code, options, and initial stock.
 * 7. Register and authenticate customer with random credentials.
 * 8. Customer adds seller A's variant to cart with quantity.
 * 9. Customer adds seller B's variant to cart with quantity.
 * 10. Customer places checkout order with items from both sellers.
 * 11. Seller A calls order items endpoint with the order ID.
 * 12. Verify seller A only sees their own order item (not seller B's).
 * 13. Seller B calls order items endpoint with the same order ID.
 * 14. Verify seller B only sees their own order item (not seller A's).
 * 15. Validate both sellers see consistent order summary data.
 */
export async function test_api_seller_order_items_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: sellerAJoinBody,
  });
  typia.assert(sellerAAuthorized);
  const sellerAId = sellerAAuthorized.id;
  // 2. Seller A creates a product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 3. Seller A creates a variant
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [{ key: "color", value: "Red" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variantA);
  // 4. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: sellerBJoinBody,
  });
  typia.assert(sellerBAuthorized);
  const sellerBId = sellerBAuthorized.id;
  // 5. Seller B creates a product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 6. Seller B creates a variant
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [{ key: "size", value: "Large" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variantB);
  // 7. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  // 8. Customer adds seller A's variant to cart
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantA.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  // 9. Customer adds seller B's variant to cart
  const cartItemB =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantB.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  // 10. Customer places checkout order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // 11. Seller A calls order items endpoint
  const sellerAOrderItems =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerAConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(sellerAOrderItems);
  // 12. Verify seller A only sees their own order item
  TestValidator.equals(
    "seller A sees only their items",
    sellerAOrderItems.data.length,
    1,
  );
  TestValidator.equals(
    "seller A item is from their product",
    sellerAOrderItems.data[0].productVariant.id,
    variantA.id,
  );
  TestValidator.equals(
    "seller A item seller matches seller A",
    sellerAOrderItems.data[0].seller.id,
    sellerAId,
  );
  // 13. Seller B calls order items endpoint
  const sellerBOrderItems =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerBConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(sellerBOrderItems);
  // 14. Verify seller B only sees their own order item
  TestValidator.equals(
    "seller B sees only their items",
    sellerBOrderItems.data.length,
    1,
  );
  TestValidator.equals(
    "seller B item is from their product",
    sellerBOrderItems.data[0].productVariant.id,
    variantB.id,
  );
  TestValidator.equals(
    "seller B item seller matches seller B",
    sellerBOrderItems.data[0].seller.id,
    sellerBId,
  );
  // 15. Validate both sellers see consistent order summary
  TestValidator.equals(
    "both sellers see same order number",
    sellerAOrderItems.data[0].order.order_number,
    sellerBOrderItems.data[0].order.order_number,
  );
  TestValidator.equals(
    "both sellers see same order ID",
    sellerAOrderItems.data[0].order.id,
    sellerBOrderItems.data[0].order.id,
  );
}
