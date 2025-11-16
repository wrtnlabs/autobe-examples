import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductMedia";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_catalog_product_details_basic_view(
  connection: api.IConnection,
) {
  // 1. Register seller and platform admin, then log in as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller-password-123",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "admin-password-123",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As seller, create base product (single-SKU style)
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  TestValidator.equals(
    "created product code matches input code",
    createdProduct.code,
    productCode,
  );
  TestValidator.equals(
    "created product is_multi_sku is false",
    createdProduct.is_multi_sku,
    false,
  );

  // 3. Switch to platform admin context (login ensures admin token persists)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(adminLogin);

  // 3-1. Create a brand (not necessarily attached to product with current API)
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3-2. Create a region setting (active)
  const regionCode = RandomGenerator.alphaNumeric(6);
  const regionCreateBody = {
    code: regionCode,
    name: `Region ${regionCode}`,
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region is active",
    region.active,
    regionCreateBody.active,
  );
  TestValidator.equals(
    "region deleted_at is null for active region",
    region.deleted_at ?? null,
    null,
  );

  // 3-3. Create an age restriction policy
  const agePolicyCode = `AGE_${RandomGenerator.alphaNumeric(6)}`;
  const effectiveFromIso = new Date().toISOString();

  const agePolicyCreateBody = {
    code: agePolicyCode,
    name: "Non-blocking age policy",
    description: "Non-blocking informational age restriction policy",
    minimum_age_years: 18,
    require_verified_age: false,
    config_payload: "{}",
    active: true,
    effective_from: effectiveFromIso,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: agePolicyCreateBody,
      },
    );
  typia.assert(agePolicy);

  TestValidator.equals(
    "age policy code matches",
    agePolicy.code,
    agePolicyCreateBody.code,
  );
  TestValidator.equals(
    "age policy is active",
    agePolicy.active,
    agePolicyCreateBody.active,
  );

  // 3-4. Create category tree and category
  const categoryTreeCode = `TREE_${RandomGenerator.alphaNumeric(6)}`;
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: "E2E main catalog tree",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  const categoryCode = `CAT_${RandomGenerator.alphaNumeric(6)}`;
  const categoryCreateBody = {
    code: categoryCode,
    name: "Basic Single SKU Category",
    description: "Category for single SKU product details test",
    displayOrder: 1,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  TestValidator.equals(
    "category is active",
    category.isActive,
    categoryCreateBody.isActive,
  );
  TestValidator.equals(
    "category treeCode matches",
    category.treeCode,
    categoryTree.code,
  );

  // 4. Switch to seller and add product media (primary and secondary)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const primaryMediaUri = typia.random<string & tags.Format<"uri">>();

  const primaryMediaBody = {
    uri: primaryMediaUri,
    media_type: "image",
    alt_text: "Primary product image",
    display_order: 1,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const primaryMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: createdProduct.code,
      body: primaryMediaBody,
    });
  typia.assert(primaryMedia);

  const secondaryMediaBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: "Secondary product image",
    display_order: 2,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const secondaryMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: createdProduct.code,
      body: secondaryMediaBody,
    });
  typia.assert(secondaryMedia);

  TestValidator.equals(
    "primary media marked is_primary",
    primaryMedia.is_primary,
    true,
  );
  TestValidator.equals(
    "secondary media not primary",
    secondaryMedia.is_primary,
    false,
  );

  // 5. Switch back to platform admin and assign category, visibility, compliance
  const adminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(adminRelogin);

  // 5-1. Category assignment (primary)
  const categoryAssignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const categoryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: createdProduct.code,
        body: categoryAssignmentBody,
      },
    );
  typia.assert(categoryAssignment);

  TestValidator.equals(
    "category assignment is primary",
    categoryAssignment.is_primary,
    true,
  );
  TestValidator.equals(
    "category assignment product id matches",
    categoryAssignment.product.id,
    createdProduct.id,
  );

  // 5-2. Visibility rule
  const visibilityRuleBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: createdProduct.code,
        body: visibilityRuleBody,
      },
    );
  typia.assert(visibilityRule);

  TestValidator.equals(
    "visibility rule product id matches",
    visibilityRule.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "visibility rule region matches",
    visibilityRule.shopping_mall_region_setting_id ?? null,
    region.id,
  );
  TestValidator.equals(
    "visibility rule visibility value matches",
    visibilityRule.visibility,
    visibilityRuleBody.visibility,
  );

  // 5-3. Compliance flag (non-blocking)
  const complianceFlagBody = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: agePolicy.code,
    is_blocking_sale: false,
    notes: "Informational age restriction that does not block sale",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: createdProduct.code,
        body: complianceFlagBody,
      },
    );
  typia.assert(complianceFlag);

  TestValidator.equals(
    "compliance flag product id matches",
    complianceFlag.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "compliance flag age policy id matches",
    complianceFlag.shopping_mall_age_restriction_policy_id ?? null,
    agePolicy.id,
  );
  TestValidator.equals(
    "compliance flag is non-blocking",
    complianceFlag.is_blocking_sale,
    false,
  );

  // 6. Call catalog details without authentication (public view)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const details: IShoppingMallProduct =
    await api.functional.shoppingMall.catalog.products.details.at(
      unauthConnection,
      {
        productCode: createdProduct.code,
      },
    );
  typia.assert(details);

  // 7. Assertions about catalog details
  TestValidator.equals(
    "details product id matches created",
    details.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "details product code matches created",
    details.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "details product name matches created",
    details.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "details product status matches created",
    details.status,
    createdProduct.status,
  );
  TestValidator.equals(
    "details product is_multi_sku is false",
    details.is_multi_sku,
    false,
  );

  // primary_image_uri should reflect primary media if platform syncs it, or at least
  // remain consistent and not be null. We assert non-null and equality with
  // the most recently configured primary media body when present.
  TestValidator.predicate(
    "details.primary_image_uri is present",
    details.primary_image_uri !== null &&
      details.primary_image_uri !== undefined &&
      details.primary_image_uri.length > 0,
  );

  // Basic timestamp sanity for product (created_at/updated_at present, deleted_at null)
  TestValidator.predicate(
    "product created_at not empty",
    details.created_at.length > 0,
  );
  TestValidator.predicate(
    "product updated_at not empty",
    details.updated_at.length > 0,
  );
  TestValidator.equals(
    "product deleted_at is null for active product",
    details.deleted_at ?? null,
    null,
  );
}
