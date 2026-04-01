import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

export async function test_api_order_item_snapshot_historical_preservation_after_seller_profile_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product (generation function handles category)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Get seller profile to capture original shop name and logo BEFORE order
  const sellerProfile =
    await api.functional.shoppingMall.sellers.profile.update(
      sellerLoginConnection,
      {
        body: {
          shop_name: "Original Shop " + RandomGenerator.alphabets(5),
          description: "Original description",
          logo_image_uri: "https://original-logo.example.com/logo.png",
        } satisfies IShoppingMallSellerProfile.IUpdate,
      },
    );
  typia.assert(sellerProfile);
  const originalShopName = sellerProfile.shop_name;
  const originalShopLogo = sellerProfile.logo_image_uri;
  // 5. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 6. Customer places order (creates order item snapshot with seller profile at time of purchase)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Get the order item from the order
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItemId = order.orderItems[0].id;
  // 7. Seller updates profile with NEW shop name and logo AFTER order is placed
  const updatedShopName = "Updated Shop " + RandomGenerator.alphabets(5);
  const updatedShopLogo =
    "https://updated-logo.example.com/" +
    RandomGenerator.alphabets(10) +
    ".png";
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(
      sellerLoginConnection,
      {
        body: {
          shop_name: updatedShopName,
          logo_image_uri: updatedShopLogo,
        } satisfies IShoppingMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Verify profile was actually updated
  TestValidator.equals(
    "seller profile shop name updated",
    updatedProfile.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "seller profile logo updated",
    updatedProfile.logo_image_uri,
    updatedShopLogo,
  );
  // 8. Seller retrieves order item snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.patchByItemid(
      sellerLoginConnection,
      {
        itemId: orderItemId,
      },
    );
  typia.assert(snapshot);
  // 9. Seller retrieves specific snapshot by ID
  const specificSnapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.getByItemidAndSnapshotid(
      sellerLoginConnection,
      {
        itemId: orderItemId,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(specificSnapshot);
  // 10. CRITICAL: Validate snapshot contains ORIGINAL seller info, NOT updated values
  // This proves snapshot immutability - historical data is preserved
  TestValidator.equals(
    "snapshot preserves original shop name",
    specificSnapshot.sellerShopName,
    originalShopName,
  );
  TestValidator.equals(
    "snapshot preserves original shop logo",
    specificSnapshot.sellerShopLogo,
    originalShopLogo,
  );
  // Additional validation: confirm snapshot does NOT contain updated values
  TestValidator.notEquals(
    "snapshot does not contain updated shop name",
    specificSnapshot.sellerShopName,
    updatedShopName,
  );
  TestValidator.notEquals(
    "snapshot does not contain updated shop logo",
    specificSnapshot.sellerShopLogo,
    updatedShopLogo,
  );
}
