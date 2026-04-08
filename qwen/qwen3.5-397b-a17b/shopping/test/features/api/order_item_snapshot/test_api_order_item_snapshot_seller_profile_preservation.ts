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
 * Test that the order item snapshot preserves the seller profile state at purchase time even after the seller updates their shop information.
 *
 * Validates the complete order item snapshot immutability workflow including seller profile creation, product listing, customer order placement, and snapshot retrieval before and after seller profile updates. Ensures that the snapshot correctly preserves the original shop name, logo URL, product details, and variant information regardless of subsequent seller profile modifications.
 *
 * Special attention is given to verifying that the snapshot maintains historical accuracy for dispute resolution purposes. The test confirms that snapshots are immutable records that capture the exact state of the product and seller profile at the moment of purchase, preventing sellers from altering historical order records by updating their shop information.
 *
 * 1. Seller joins and authenticates with the platform.
 * 2. Seller creates initial shop profile with shop name 'Original Shop' and logo URL.
 * 3. Seller creates a product with base price and description.
 * 4. Seller creates a product variant with SKU code and option values.
 * 5. Customer joins and authenticates with the platform.
 * 6. Customer adds the product variant to their shopping cart.
 * 7. Customer places an order which creates order item snapshots.
 * 8. Seller retrieves the order item snapshot and captures original values.
 * 9. Seller updates their shop profile to new name 'Updated Shop' and new logo URL.
 * 10. Seller retrieves the same order item snapshot again.
 * 11. Validates snapshot still shows 'Original Shop' name, not 'Updated Shop'.
 * 12. Validates snapshot still shows original logo URL, not the new logo.
 * 13. Validates product name, description, variant price, and options remain unchanged.
 */
export async function test_api_order_item_snapshot_seller_profile_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and login
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  // 2. Seller creates initial shop profile with 'Original Shop' name and logo
  const originalShopName = "Original Shop";
  const originalLogoUrl = "https://example.com/original-logo.png";
  const shopDescription = "Original shop description";
  const sellerProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: originalShopName,
        shopDescription: shopDescription,
        logoImageUrl: originalLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(sellerProfile);
  TestValidator.equals(
    "shop name matches",
    sellerProfile.shop_name,
    originalShopName,
  );
  TestValidator.equals(
    "logo URL matches",
    sellerProfile.logo_image_url,
    originalLogoUrl,
  );
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Snapshot",
        description: "Product description for snapshot test",
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SNAPSHOT-TEST-001",
          option_values: "Color: Red, Size: Large",
          price: 12000,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer setup - join and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Customer1234!";
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerLogin);
  // 6. Customer adds product variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem);
  // 7. Customer places order (requires a customer address - we need to create one first)
  // For this test, we'll use a random UUID as the address ID
  // Note: In real scenario, customer would need to create an address first
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.equals(
    "order item variant matches",
    orderItem.productVariant.id,
    variant.id,
  );
  // 8. Seller retrieves the order item snapshot (before profile update)
  const snapshotBeforeUpdate =
    await api.functional.shoppingMall.seller.seller.order_items.snapshot.at(
      sellerConnection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshotBeforeUpdate);
  // Capture original snapshot values
  const capturedProductName = snapshotBeforeUpdate.product_name;
  const capturedProductDescription = snapshotBeforeUpdate.product_description;
  const capturedVariantPrice = snapshotBeforeUpdate.variant_price;
  const capturedSellerShopName = snapshotBeforeUpdate.seller_shop_name;
  const capturedSellerLogoUrl = snapshotBeforeUpdate.seller_logo_url;
  const capturedOptions = snapshotBeforeUpdate.options;
  // Validate snapshot has original shop name
  TestValidator.equals(
    "snapshot shop name before update",
    capturedSellerShopName,
    originalShopName,
  );
  TestValidator.equals(
    "snapshot logo URL before update",
    capturedSellerLogoUrl,
    originalLogoUrl,
  );
  TestValidator.equals(
    "snapshot product name",
    capturedProductName,
    product.name,
  );
  TestValidator.equals(
    "snapshot variant price",
    capturedVariantPrice,
    variant.price ?? product.base_price,
  );
  // 9. Seller updates shop profile to new name and logo
  const updatedShopName = "Updated Shop";
  const updatedLogoUrl = "https://example.com/updated-logo.png";
  const updatedDescription = "Updated shop description";
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: updatedShopName,
        shopDescription: updatedDescription,
        logoImageUrl: updatedLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "updated shop name",
    updatedProfile.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "updated logo URL",
    updatedProfile.logo_image_url,
    updatedLogoUrl,
  );
  // 10. Seller retrieves the same order item snapshot again (after profile update)
  const snapshotAfterUpdate =
    await api.functional.shoppingMall.seller.seller.order_items.snapshot.at(
      sellerConnection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshotAfterUpdate);
  // 11-12. Validate snapshot still shows original values, not updated values
  TestValidator.equals(
    "snapshot shop name preserved",
    snapshotAfterUpdate.seller_shop_name,
    originalShopName,
  );
  TestValidator.notEquals(
    "snapshot shop name differs from updated",
    snapshotAfterUpdate.seller_shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "snapshot logo URL preserved",
    snapshotAfterUpdate.seller_logo_url,
    originalLogoUrl,
  );
  TestValidator.notEquals(
    "snapshot logo URL differs from updated",
    snapshotAfterUpdate.seller_logo_url,
    updatedLogoUrl,
  );
  // 13. Validate product details also remain unchanged in snapshot
  TestValidator.equals(
    "snapshot product name preserved",
    snapshotAfterUpdate.product_name,
    capturedProductName,
  );
  TestValidator.equals(
    "snapshot product description preserved",
    snapshotAfterUpdate.product_description,
    capturedProductDescription,
  );
  TestValidator.equals(
    "snapshot variant price preserved",
    snapshotAfterUpdate.variant_price,
    capturedVariantPrice,
  );
  TestValidator.equals(
    "snapshot options count preserved",
    snapshotAfterUpdate.options.length,
    capturedOptions.length,
  );
  // Validate options are identical
  for (let i = 0; i < capturedOptions.length; i++) {
    TestValidator.equals(
      `snapshot option ${i} key`,
      snapshotAfterUpdate.options[i].key,
      capturedOptions[i].key,
    );
    TestValidator.equals(
      `snapshot option ${i} value`,
      snapshotAfterUpdate.options[i].value,
      capturedOptions[i].value,
    );
  }
}
