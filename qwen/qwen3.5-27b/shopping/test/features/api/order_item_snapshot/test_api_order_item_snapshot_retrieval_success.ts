import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test successful retrieval of an order item snapshot by a customer for an item in their own order.
 *
 * Validates the complete order item snapshot retrieval workflow including seller product creation, customer order placement, and snapshot data integrity. Ensures that order item snapshots preserve the exact state of products, variants, and seller information at the time of purchase, including variant options as key-value pairs and product images with display order.
 *
 * Special attention is given to verifying that all snapshot fields are present and immutable, including product details, variant specifications, seller shop information, and the created_at timestamp matching the order placement time.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Customer registers and authenticates to place orders.
 * 3. Seller creates a product with base price and description.
 * 4. Customer adds product variant to shopping cart with quantity.
 * 5. Customer completes checkout to create order with order item snapshot.
 * 6. Customer retrieves the order item snapshot by snapshot ID.
 * 7. Validates snapshot contains complete product, variant, and seller information.
 * 8. Confirms variant options array has key-value pairs and product images have display_order.
 */
export async function test_api_order_item_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart
  const variantId =
    product.variants.length > 0
      ? product.variants[0].id
      : typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: 1,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 6. Get the order item ID to use as snapshot ID
  if (order.items.length === 0) {
    throw new Error("Order has no items, cannot test snapshot retrieval");
  }
  const firstOrderItem = order.items[0];
  const snapshotId = firstOrderItem.id;
  // 7. Customer retrieves the order item snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.order_item_snapshots.at(
      customerConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot business logic - product information matches order item
  TestValidator.equals(
    "snapshot product name matches order item",
    snapshot.product_name,
    firstOrderItem.product_name,
  );
  TestValidator.equals(
    "snapshot variant SKU matches order item",
    snapshot.variant_sku_code,
    firstOrderItem.variant_sku_code,
  );
  TestValidator.equals(
    "snapshot variant price matches order item",
    snapshot.variant_price,
    firstOrderItem.variant_price,
  );
  TestValidator.equals(
    "snapshot seller shop name matches order item",
    snapshot.seller_shop_name,
    firstOrderItem.seller_shop_name,
  );
  // 9. Validate variant options structure
  TestValidator.predicate(
    "snapshot has variant options array",
    Array.isArray(snapshot.variantOptions),
  );
  if (snapshot.variantOptions.length > 0) {
    TestValidator.predicate(
      "all variant options have valid key-value pairs",
      snapshot.variantOptions.every(
        (opt) => opt.key.length > 0 && opt.value.length > 0,
      ),
    );
  }
  // 10. Validate product images structure
  TestValidator.predicate(
    "snapshot has product images array",
    Array.isArray(snapshot.productImages),
  );
  if (snapshot.productImages.length > 0) {
    TestValidator.predicate(
      "all product images have valid URI and display order",
      snapshot.productImages.every(
        (img) => img.image_uri.length > 0 && img.display_order >= 1,
      ),
    );
  }
  // 11. Validate snapshot timestamp
  TestValidator.predicate(
    "snapshot created_at is valid datetime",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot created_at matches order created_at",
    snapshot.created_at === order.created_at,
  );
}
