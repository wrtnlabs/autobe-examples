import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that the order item snapshot preserves historical product and seller profile data at the time of purchase, even after subsequent modifications.
 *
 * Validates the complete order item snapshot preservation workflow including seller account setup, product creation with initial data, customer order placement, and post-order modifications to product and seller profile. Ensures that the snapshot data remains immutable and reflects the exact state at purchase time.
 *
 * Special attention is given to verifying that the snapshot preserves original product name, description, variant price, and seller shop information despite later modifications to these entities. This supports dispute resolution with accurate historical records.
 *
 * 1. Seller registers account and creates product with initial name 'Original Product Name'.
 * 2. Seller creates product variant with specific options and price.
 * 3. Seller updates shop profile with shop name 'Original Shop'.
 * 4. Customer registers and places order for the product variant.
 * 5. After order placement, seller modifies product name to 'Modified Product Name'.
 * 6. Seller updates shop profile to 'Modified Shop Name'.
 * 7. Seller retrieves order item and validates snapshot contains original values.
 */
export async function test_api_order_item_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Create product with initial data
  const originalProductName = "Original Product Name";
  const originalProductDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create product variant with specific options
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variantOptionValues = "Color: Red, Size: Large";
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "RED-LARGE-001",
          option_values: variantOptionValues,
          price: variantPrice,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Update seller shop profile with original shop name
  const originalShopName = "Original Shop";
  const originalLogoUrl = typia.random<string & tags.Format<"uri">>();
  const sellerProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: originalShopName,
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
        logoImageUrl: originalLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(sellerProfile);
  // 5. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(customerLogin);
  // 6. Customer places order for the product variant
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  // 7. Seller updates product name after order placement
  const modifiedProductName = "Modified Product Name";
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: modifiedProductName,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 8. Seller updates shop profile after order placement
  const modifiedShopName = "Modified Shop Name";
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: modifiedShopName,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 9. Seller retrieves order item and validates snapshot
  const orderItemDetail =
    await api.functional.shoppingMall.seller.seller.order_items.at(
      sellerConnection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert(orderItemDetail);
  // 10. Validate snapshot preserves original values
  TestValidator.equals(
    "snapshot product name is original",
    orderItemDetail.snapshot.product_name,
    originalProductName,
  );
  TestValidator.equals(
    "snapshot product description is original",
    orderItemDetail.snapshot.product_description,
    originalProductDescription,
  );
  TestValidator.equals(
    "snapshot variant price is original",
    orderItemDetail.snapshot.variant_price,
    variantPrice,
  );
  TestValidator.equals(
    "snapshot seller shop name is original",
    orderItemDetail.snapshot.seller_shop_name,
    originalShopName,
  );
  TestValidator.equals(
    "snapshot seller logo URL is original",
    orderItemDetail.snapshot.seller_logo_url,
    originalLogoUrl,
  );
  // Validate snapshot options contain variant options
  TestValidator.predicate(
    "snapshot has options",
    () => orderItemDetail.snapshot.options.length > 0,
  );
  // Verify current product name differs from snapshot
  TestValidator.notEquals(
    "current product name differs from snapshot",
    updatedProduct.name,
    orderItemDetail.snapshot.product_name,
  );
  // Verify current shop name differs from snapshot
  TestValidator.notEquals(
    "current shop name differs from snapshot",
    updatedProfile.shop_name,
    orderItemDetail.snapshot.seller_shop_name,
  );
}