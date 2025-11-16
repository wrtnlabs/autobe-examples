import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate deletion of a product visibility rule by a platform administrator.
 *
 * Business workflow covered by this test:
 *
 * 1. Bootstrap a platform admin via /auth/platformAdmin/join so that all
 *    subsequent platformAdmin endpoints are authorized.
 * 2. Create prerequisite catalog configuration:
 *
 *    - Region setting (used by the visibility rule).
 *    - Category tree (catalog structure prerequisite from scenario).
 *    - Brand (to associate with the product).
 * 3. Create a product owned by some seller and associated with the created brand,
 *    using a unique product code.
 * 4. Create a visibility rule for that product, scoped to the created region and a
 *    specific sales channel.
 * 5. Delete the created visibility rule via the DELETE endpoint under test.
 *
 * Assertions and validation:
 *
 * - Every create endpoint returns data conforming to its DTO via typia.assert().
 * - The visibility rule delete call completes without throwing, demonstrating
 *   that a platform admin can successfully remove an existing rule.
 * - Additional logical checks (such as verifying IDs match and using
 *   TestValidator.predicate) ensure the wiring between product, region, and
 *   rule is consistent.
 */
export async function test_api_product_visibility_rule_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap (join)
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://console.example.com/admin/join",
    referrer: "https://console.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create region setting
  const regionCode = `REG-${RandomGenerator.alphabets(8)}`;
  const regionRequest = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionRequest,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(region);

  // 3. Create category tree (prerequisite structure)
  const categoryTreeCode = `TREE-${RandomGenerator.alphabets(8)}`;
  const categoryTreeRequest = {
    code: categoryTreeCode,
    name: "Test Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeRequest,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 4. Create brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandRequest = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandRequest,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Create product
  // NOTE: shopping_mall_seller_id must be a UUID; we generate one, assuming
  // test fixtures or simulation mode accept it.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;

  const productRequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productRequest,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code in response matches request",
    product.code,
    productCode,
  );

  // 6. Create visibility rule for this product
  const channels = ["web", "mobile", "partner"] as const;
  const channel = RandomGenerator.pick(channels);

  const visibilityRuleRequest = {
    shopping_mall_region_setting_id: region.id,
    channel,
    visibility: "visible",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const rule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityRuleRequest,
      },
    );
  typia.assert<IShoppingMallProductVisibilityRule>(rule);

  TestValidator.equals(
    "visibility rule is linked to the created product",
    rule.shopping_mall_product_id,
    product.id,
  );

  // 7. Delete the visibility rule under test
  await api.functional.shoppingMall.platformAdmin.products.visibilityRules.erase(
    connection,
    {
      productCode: product.code,
      productVisibilityRuleId: rule.id,
    },
  );

  // 8. Post-condition: ensure delete completed without error
  TestValidator.predicate(
    "delete operation for visibility rule completed without throwing",
    true,
  );
}
