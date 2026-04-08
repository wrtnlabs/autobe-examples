import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test variant creation with optional price override field.
 *
 * An approved seller creates a variant with a specific price that differs from the product's base price. The test validates: (1) Variant accepts non-null price value, (2) Price overrides the product base price for this specific variant, (3) Response includes the custom price value, (4) Variant can be created with price higher or lower than base price. This scenario tests the optional price field functionality where certain variants (e.g., larger sizes, premium materials) have different pricing than the product default.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers and logs in to obtain authenticated connection.
 * 3. Seller creates a product with a base price.
 * 4. Seller creates first variant with price higher than base price (premium variant).
 * 5. Seller creates second variant with price lower than base price (discount variant).
 * 6. Seller creates third variant without price override (uses base price).
 * 7. Validates all variants have correct price values and reference the correct product.
 */
export async function test_api_product_variant_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123!";
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Seller login (assuming account is approved for testing)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Seller creates product with base price
  const basePrice = 50000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // 5. Create premium variant with price higher than base price
  const premiumPrice = 65000;
  const premiumVariant =
    await api.functional.shoppingMall.seller.variants.create(sellerConnection, {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: "PREMIUM-LARGE",
        option_values: "Color: Premium Black, Size: Large",
        price: premiumPrice,
      } satisfies IShoppingMallProductVariant.ICreate,
    });
  typia.assert(premiumVariant);
  // 6. Create discount variant with price lower than base price
  const discountPrice = 40000;
  const discountVariant =
    await api.functional.shoppingMall.seller.variants.create(sellerConnection, {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: "DISCOUNT-SMALL",
        option_values: "Color: Standard White, Size: Small",
        price: discountPrice,
      } satisfies IShoppingMallProductVariant.ICreate,
    });
  typia.assert(discountVariant);
  // 7. Create standard variant without price override (uses base price)
  const standardVariant =
    await api.functional.shoppingMall.seller.variants.create(sellerConnection, {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: "STANDARD-MEDIUM",
        option_values: "Color: Standard Blue, Size: Medium",
        price: null,
      } satisfies IShoppingMallProductVariant.ICreate,
    });
  typia.assert(standardVariant);
  // 8. Validate all variants
  TestValidator.equals(
    "premium variant price",
    premiumVariant.price,
    premiumPrice,
  );
  TestValidator.equals(
    "premium variant product",
    premiumVariant.product.id,
    product.id,
  );
  TestValidator.predicate(
    "premium price higher than base",
    premiumVariant.price! > basePrice,
  );
  TestValidator.equals(
    "discount variant price",
    discountVariant.price,
    discountPrice,
  );
  TestValidator.equals(
    "discount variant product",
    discountVariant.product.id,
    product.id,
  );
  TestValidator.predicate(
    "discount price lower than base",
    discountVariant.price! < basePrice,
  );
  TestValidator.equals("standard variant price", standardVariant.price, null);
  TestValidator.equals(
    "standard variant product",
    standardVariant.product.id,
    product.id,
  );
}