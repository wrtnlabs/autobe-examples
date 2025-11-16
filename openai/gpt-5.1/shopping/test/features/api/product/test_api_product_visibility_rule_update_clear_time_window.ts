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

export async function test_api_product_visibility_rule_update_clear_time_window(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a region setting to be referenced by the visibility rule
  const regionCreateBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(6)}`,
    name: `Region ${RandomGenerator.name(1)}`,
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 3. Create a category tree (prerequisite for catalog configuration)
  const categoryTreeCreateBody = {
    code: `TREE_${RandomGenerator.alphaNumeric(8)}`,
    name: `Tree ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 4. Create a brand to associate with the product
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Create a product owned by some seller and associated with the brand
  // Seller existence is not validated at type level; use a random UUID string
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();

  const productCode = `PROD_${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );

  // 6. Create an initial visibility rule with a bounded time window
  const now = new Date();
  const inOneDay = RandomGenerator.date(now, 24 * 60 * 60 * 1000);

  const initialStartsAt = now.toISOString();
  const initialEndsAt = inOneDay.toISOString();

  const visibilityRuleCreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: initialStartsAt,
    ends_at: initialEndsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const originalRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityRuleCreateBody,
      },
    );
  typia.assert(originalRule);

  TestValidator.equals(
    "original rule should be attached to the created product",
    originalRule.shopping_mall_product_id,
    product.id,
  );

  TestValidator.predicate(
    "original rule starts_at should be non-null",
    originalRule.starts_at !== null && originalRule.starts_at !== undefined,
  );

  TestValidator.predicate(
    "original rule ends_at should be non-null",
    originalRule.ends_at !== null && originalRule.ends_at !== undefined,
  );

  // 7. Update the visibility rule to clear its effective period
  const updateBody = {
    starts_at: null,
    ends_at: null,
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

  // 8. Validate that time window has been cleared while other core fields remain unchanged
  TestValidator.equals(
    "rule id should remain the same after update",
    updatedRule.id,
    originalRule.id,
  );

  TestValidator.equals(
    "shopping_mall_product_id should remain the same after update",
    updatedRule.shopping_mall_product_id,
    originalRule.shopping_mall_product_id,
  );

  TestValidator.equals(
    "channel should remain unchanged after clearing time window",
    updatedRule.channel,
    originalRule.channel,
  );

  TestValidator.equals(
    "visibility should remain unchanged after clearing time window",
    updatedRule.visibility,
    originalRule.visibility,
  );

  if (originalRule.region !== undefined && originalRule.region !== null) {
    TestValidator.predicate(
      "updated rule should still have a non-null region when original had one",
      updatedRule.region !== undefined && updatedRule.region !== null,
    );

    if (updatedRule.region !== undefined && updatedRule.region !== null) {
      TestValidator.equals(
        "region id should remain unchanged",
        updatedRule.region.id,
        originalRule.region.id,
      );
      TestValidator.equals(
        "region code should remain unchanged",
        updatedRule.region.code,
        originalRule.region.code,
      );
      TestValidator.equals(
        "region name should remain unchanged",
        updatedRule.region.name,
        originalRule.region.name,
      );
      TestValidator.equals(
        "region active flag should remain unchanged",
        updatedRule.region.active,
        originalRule.region.active,
      );
    }
  }

  TestValidator.equals(
    "starts_at should be cleared to null",
    updatedRule.starts_at,
    null,
  );

  TestValidator.equals(
    "ends_at should be cleared to null",
    updatedRule.ends_at,
    null,
  );

  // Optional: ensure no other fields except starts_at/ends_at/updated_at changed
  const strippedOriginal = {
    ...originalRule,
    starts_at: null,
    ends_at: null,
  };

  const strippedUpdated = {
    ...updatedRule,
  };

  TestValidator.equals(
    "rules should be equal when ignoring time window differences",
    strippedUpdated,
    strippedOriginal,
    (key) => key === "updated_at",
  );
}
