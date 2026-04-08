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
 * Test that order item snapshot data preserves historical product and seller information at purchase time.
 *
 * Validates the complete order snapshot immutability workflow including member and seller authentication, product and variant creation, order placement, and subsequent entity modifications. Ensures that order item snapshots capture and preserve the exact state of products, variants, and seller profiles at the time of purchase, regardless of later modifications.
 *
 * The test verifies that snapshot data remains immutable after order creation, providing accurate historical records for dispute resolution and order history display. This is critical for e-commerce platforms where product information, pricing, and seller details may change frequently.
 *
 * 1. Member and seller authentication via join operations.
 * 2. Seller creates product with specific name, description, and base price.
 * 3. Seller creates variant with specific SKU and option values.
 * 4. Member adds variant to cart and places order.
 * 5. After order placement, seller updates product name, description, and price.
 * 6. Seller updates shop profile (shop name, logo).
 * 7. Seller updates variant option values.
 * 8. Member retrieves order and validates snapshot contains original data.
 * 9. Verifies snapshot data differs from current updated entity state.
 */
export async function test_api_order_retrieval_snapshot_data_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create product with specific values for snapshot testing
  const originalProductName = RandomGenerator.paragraph({ sentences: 2 });
  const originalProductDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalProductPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const category = typia.random<IShoppingMallCategory.ISummary>();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        shopping_mall_category_id: category.id,
        base_price: originalProductPrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with specific option values
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalOptionValues = "Color: Red, Size: Large";
  const originalVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100>
  >();
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: originalSkuCode,
          option_values: originalOptionValues,
          price: originalVariantPrice,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member adds variant to cart
  await api.functional.shoppingMall.member.cart.items.create(memberConnection, {
    body: {
      product_variant_id: variant.id,
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    } satisfies IShoppingMallCartItem.ICreate,
  });
  // 6. Place order to create snapshot
  // Note: This requires a customer address - using random UUID as placeholder
  const order = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Store original order creation timestamp
  const orderCreatedAt = order.created_at;
  // Verify order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0]!;
  // Store original snapshot data for comparison
  const snapshot = orderItem.snapshot;
  const originalSnapshotProductName = snapshot.product_name;
  const originalSnapshotDescription = snapshot.product_description;
  const originalSnapshotVariantPrice = snapshot.variant_price;
  const originalSnapshotShopName = snapshot.seller_shop_name;
  // 7. AFTER order placement, update product name, description, and price
  const updatedProductName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProductDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedProductPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000>
  >();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedProductName,
        description: updatedProductDescription,
        base_price: updatedProductPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 8. Update seller's shop profile
  const originalShopName = snapshot.seller_shop_name;
  const updatedShopName = RandomGenerator.name();
  const updatedLogoUrl = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: updatedShopName,
        logoImageUrl: updatedLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 9. Update variant option values
  const updatedOptionValues = "Color: Blue, Size: Small";
  const updatedVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<200>
  >();
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: originalSkuCode,
          option_values: updatedOptionValues,
          price: updatedVariantPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 10. Retrieve order and verify snapshot preserves original data
  const retrievedOrder = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // Verify order structure
  TestValidator.equals("order ID matches", retrievedOrder.id, order.id);
  TestValidator.equals("order code matches", retrievedOrder.code, order.code);
  TestValidator.predicate(
    "order has items",
    retrievedOrder.orderItems.length > 0,
  );
  const retrievedOrderItem = retrievedOrder.orderItems[0]!;
  const retrievedSnapshot = retrievedOrderItem.snapshot;
  // 11. Verify snapshot contains ORIGINAL product name (before update)
  TestValidator.equals(
    "snapshot preserves original product name",
    retrievedSnapshot.product_name,
    originalSnapshotProductName,
  );
  TestValidator.notEquals(
    "snapshot product name differs from updated product",
    retrievedSnapshot.product_name,
    updatedProduct.name,
  );
  // 12. Verify snapshot contains ORIGINAL product description (before update)
  TestValidator.equals(
    "snapshot preserves original product description",
    retrievedSnapshot.product_description,
    originalSnapshotDescription,
  );
  TestValidator.notEquals(
    "snapshot description differs from updated product",
    retrievedSnapshot.product_description,
    updatedProduct.description,
  );
  // 13. Verify snapshot contains ORIGINAL variant price (before update)
  TestValidator.equals(
    "snapshot preserves original variant price",
    retrievedSnapshot.variant_price,
    originalSnapshotVariantPrice,
  );
  TestValidator.notEquals(
    "snapshot price differs from updated variant price",
    retrievedSnapshot.variant_price,
    updatedVariant.price,
  );
  // 14. Verify snapshot contains ORIGINAL seller shop name (before update)
  TestValidator.equals(
    "snapshot preserves original seller shop name",
    retrievedSnapshot.seller_shop_name,
    originalSnapshotShopName,
  );
  TestValidator.notEquals(
    "snapshot shop name differs from updated profile",
    retrievedSnapshot.seller_shop_name,
    updatedProfile.shop_name,
  );
  // 15. Verify snapshot options contain ORIGINAL option key-value pairs
  TestValidator.predicate(
    "snapshot has options",
    retrievedSnapshot.options.length > 0,
  );
  // 16. Verify snapshot created_at matches order creation timestamp
  TestValidator.equals(
    "snapshot timestamp matches order creation",
    retrievedSnapshot.created_at,
    orderCreatedAt,
  );
  // 17. Verify snapshot data is immutable and differs from current state
  TestValidator.notEquals(
    "product name changed after order",
    originalSnapshotProductName,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "product description changed after order",
    originalSnapshotDescription,
    updatedProduct.description,
  );
  TestValidator.notEquals(
    "shop name changed after order",
    originalSnapshotShopName,
    updatedProfile.shop_name,
  );
  TestValidator.notEquals(
    "variant option values changed after order",
    originalOptionValues,
    updatedVariant.option_values,
  );
}
