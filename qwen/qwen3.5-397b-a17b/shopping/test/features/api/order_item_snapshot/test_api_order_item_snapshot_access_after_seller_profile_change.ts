import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that the order item snapshot preserves the seller shop profile state
 * (shop name and logo) at the time of purchase, even after the seller changes
 * their profile.
 *
 * This test validates:
 * 1. Seller creates product and variant
 * 2. Customer places order creating order item with snapshot
 * 3. Seller retrieves order item snapshot and records original shop name and logo
 * 4. Seller updates their shop profile with new name and logo
 * 5. Seller retrieves order item snapshot again
 * 6. Validates snapshot still contains ORIGINAL shop name and logo from purchase time
 */
export async function test_api_order_item_snapshot_access_after_seller_profile_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 5. Customer places order (this creates order item with snapshot)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item ID
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 6. Seller retrieves order item snapshot and records original values
  const originalSnapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.patchByItemid(
      sellerConnection,
      {
        itemId: orderItem.id,
      },
    );
  typia.assert(originalSnapshot);
  // Record original shop name and logo from snapshot
  const originalShopName = originalSnapshot.sellerShopName;
  const originalShopLogo = originalSnapshot.sellerShopLogo;
  TestValidator.predicate(
    "snapshot has shop name",
    originalShopName.length > 0,
  );
  // 7. Seller updates their shop profile with new name and logo
  const newShopName = RandomGenerator.paragraph({ sentences: 1 });
  const newShopLogo = typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(
    typia.random<string & tags.Format<"uri">>(),
  );
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: {
        shop_name: newShopName,
        logo_image_uri: newShopLogo,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // Verify profile was actually updated
  TestValidator.equals(
    "shop name updated",
    updatedProfile.shop_name,
    newShopName,
  );
  TestValidator.equals(
    "logo updated",
    updatedProfile.logo_image_uri,
    newShopLogo,
  );
  // 8. Seller retrieves order item snapshot again
  const updatedSnapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.patchByItemid(
      sellerConnection,
      {
        itemId: orderItem.id,
      },
    );
  typia.assert(updatedSnapshot);
  // 9. Validate snapshot still contains ORIGINAL values (not updated profile values)
  TestValidator.equals(
    "snapshot preserves original shop name",
    updatedSnapshot.sellerShopName,
    originalShopName,
  );
  TestValidator.equals(
    "snapshot preserves original shop logo",
    updatedSnapshot.sellerShopLogo,
    originalShopLogo,
  );
  // Verify snapshot does NOT contain the new profile values
  TestValidator.notEquals(
    "snapshot shop name differs from updated profile",
    updatedSnapshot.sellerShopName,
    newShopName,
  );
  TestValidator.notEquals(
    "snapshot shop logo differs from updated profile",
    updatedSnapshot.sellerShopLogo,
    newShopLogo,
  );
}