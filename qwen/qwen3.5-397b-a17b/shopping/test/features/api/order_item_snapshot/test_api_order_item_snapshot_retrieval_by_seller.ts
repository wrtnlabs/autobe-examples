import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller order item snapshot retrieval for purchased items.
 *
 * Validates that a seller can successfully retrieve the immutable snapshot of an order item they sold. The snapshot preserves the exact state of product information, variant details, and seller profile at the time of purchase, ensuring accurate order history even if the original product or seller profile is later modified.
 *
 * The test establishes a complete e-commerce workflow: seller registration and profile setup, product creation with multiple variants, customer registration and order placement, followed by seller retrieval of the order item snapshot. This validates the snapshot system's ability to capture and preserve transaction data accurately.
 *
 * 1. Seller registers and authenticates on the platform.
 * 2. Seller creates shop profile with custom shop name and logo URL.
 * 3. Seller creates a product with base price and adds multiple variants with different options.
 * 4. Customer registers and authenticates independently.
 * 5. Customer adds a product variant to cart and completes order placement.
 * 6. Seller retrieves the order item snapshot using the order item ID from the placed order.
 * 7. Validates snapshot contains correct product name and description.
 * 8. Validates snapshot contains the variant price that was paid.
 * 9. Validates snapshot contains seller shop name and logo URL as set at purchase time.
 * 10. Validates snapshot options array contains all variant option key-value pairs.
 * 11. Validates snapshot created_at timestamp matches order placement time.
 * 12. Validates all snapshot data is immutable and matches state at order placement.
 */
export async function test_api_order_item_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller creates shop profile with shop name and logo
  const shopName = RandomGenerator.name(2);
  const logoUrl = typia.random<string & tags.Format<"uri">>();
  const sellerProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: shopName,
        shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
        logoImageUrl: logoUrl,
      },
    });
  typia.assert(sellerProfile);
  // 3. Seller creates a product with multiple variants
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // Create variant with specific options
  const variantPrice = basePrice + 1000;
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "RED-LARGE",
          option_values: "Color: Red, Size: Large",
          price: variantPrice,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "BLUE-SMALL",
          option_values: "Color: Blue, Size: Small",
          price: basePrice - 500,
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer joins and authenticates
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await authorize_member_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Customer adds variant to cart and places order
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: quantity,
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item from the order (should be the one we just ordered)
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 6. Seller retrieves the order item snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.seller.order_items.snapshot.at(
      sellerConnection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate product name and description
  TestValidator.equals(
    "product name matches",
    snapshot.product_name,
    productName,
  );
  TestValidator.equals(
    "product description matches",
    snapshot.product_description,
    productDescription,
  );
  // 8. Validate variant price
  TestValidator.equals(
    "variant price matches",
    snapshot.variant_price,
    variantPrice,
  );
  // 9. Validate seller shop name and logo URL
  TestValidator.equals(
    "shop name matches",
    snapshot.seller_shop_name,
    shopName,
  );
  TestValidator.equals("logo URL matches", snapshot.seller_logo_url, logoUrl);
  // 10. Validate options array contains variant option key-value pairs
  TestValidator.predicate("options array exists", snapshot.options.length > 0);
  const hasColorOption = snapshot.options.some((opt) => opt.key === "Color");
  const hasSizeOption = snapshot.options.some((opt) => opt.key === "Size");
  TestValidator.predicate("has color option", hasColorOption);
  TestValidator.predicate("has size option", hasSizeOption);
  // 11. Validate snapshot created_at matches order placement time
  TestValidator.equals(
    "snapshot time matches order time",
    snapshot.created_at,
    orderItem.createdAt,
  );
  // 12. Validate snapshot references correct order item
  TestValidator.equals(
    "snapshot references correct order item",
    snapshot.shopping_mall_order_item_id,
    orderItem.id,
  );
}
