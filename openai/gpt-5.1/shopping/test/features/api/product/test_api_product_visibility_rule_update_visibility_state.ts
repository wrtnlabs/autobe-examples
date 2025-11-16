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

export async function test_api_product_visibility_rule_update_visibility_state(
  connection: api.IConnection,
) {
  // 1. Join as platform admin and establish authenticated session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region setting for scoping visibility rule
  const regionCode = `REG-${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
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
      { body: regionBody },
    );
  typia.assert(region);

  // 3. Create a category tree (prerequisite, though not directly tied to product DTO)
  const categoryTreeCode = `CT-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Test Category Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4. Create a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: "Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create a product associated with the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  TestValidator.equals(
    "created product code should match input code",
    product.code,
    productCode,
  );

  // 6. Create initial visibility rule for the product
  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const visibilityCreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const originalRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityCreateBody,
      },
    );
  typia.assert(originalRule);

  TestValidator.equals(
    "original rule product_id should match product.id",
    originalRule.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "original rule visibility should be initial value",
    originalRule.visibility,
    "visible",
  );

  // 7. Update only the visibility field of the rule
  const newVisibility = "hidden";
  const updateBody = {
    visibility: newVisibility,
  } satisfies IShoppingMallProductVisibilityRule.IUpdate;

  const updatedRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.update(
      connection,
      {
        productCode: product.code,
        productVisibilityRuleId: originalRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 8. Assertions: identity and ownership
  TestValidator.equals(
    "updated rule id should be same as original",
    updatedRule.id,
    originalRule.id,
  );
  TestValidator.equals(
    "updated rule product id should remain the same",
    updatedRule.shopping_mall_product_id,
    originalRule.shopping_mall_product_id,
  );

  // 9. Assertions: visibility changed and others unchanged
  TestValidator.equals(
    "updated rule visibility should be new value",
    updatedRule.visibility,
    newVisibility,
  );
  TestValidator.notEquals(
    "visibility should actually change from original",
    updatedRule.visibility,
    originalRule.visibility,
  );

  TestValidator.equals(
    "channel must remain unchanged after visibility-only update",
    updatedRule.channel,
    originalRule.channel,
  );
  TestValidator.equals(
    "region setting id must remain unchanged",
    updatedRule.shopping_mall_region_setting_id,
    originalRule.shopping_mall_region_setting_id,
  );
  TestValidator.equals(
    "starts_at must remain unchanged",
    updatedRule.starts_at,
    originalRule.starts_at,
  );
  TestValidator.equals(
    "ends_at must remain unchanged",
    updatedRule.ends_at,
    originalRule.ends_at,
  );

  // 10. Assertions: timestamps
  TestValidator.equals(
    "created_at must remain unchanged",
    updatedRule.created_at,
    originalRule.created_at,
  );
  TestValidator.notEquals(
    "updated_at must be refreshed on update",
    updatedRule.updated_at,
    originalRule.updated_at,
  );
}
