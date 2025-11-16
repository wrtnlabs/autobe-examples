import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Basic enriched catalog listing with brand/category/visibility/compliance
 * context.
 *
 * This E2E test exercises the enriched product listing endpoint PATCH
 * /shoppingMall/catalog/products/enriched by constructing a minimal but
 * realistic catalog setup and verifying that a single active product becomes
 * visible when filtered by brand, category, region, and channel in the presence
 * of non-blocking compliance metadata.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin (establishes admin authentication context).
 * 2. Create a generic policy setting profile.
 * 3. Create cancellation, refund, and age restriction policies that conceptually
 *    reference policy settings / region but are not directly consumed by the
 *    enriched listing response type.
 * 4. Create a region setting used by visibility rules and by the search filter.
 * 5. Create a category tree and a single active leaf category.
 * 6. Create a brand used to tag the product and to filter the listing.
 * 7. Create a product that is active, single-SKU, associated with the brand and a
 *    dummy seller identifier, and with a valid primary image URI.
 * 8. Assign the product to the category as its primary category.
 * 9. Create a visibility rule that marks the product visible for the created
 *    region and a particular channel (e.g., "web") without time limits.
 * 10. Create a non-blocking compliance flag for the product to ensure that sale is
 *     not blocked even when compliance metadata exists.
 * 11. Call the enriched listing endpoint with filters for:
 *
 *     - Brand_id = created brand.id
 *     - Category_ids = [created category.id]
 *     - Region_setting_id = created region.id
 *     - Channel = same channel as the visibility rule
 *     - Page = 1 and page_size = small page for determinism
 * 12. Validate that:
 *
 *     - The response shape matches IPageIShoppingMallProduct.ISummary via
 *           typia.assert.
 *     - Pagination metadata reports at least one record.
 *     - At least one product in the data array corresponds to the created product,
 *           with matching name and brand summary pointing to the created brand
 *           id.
 *     - The product includes a primary_image_url that is consistent with the created
 *           product’s primary_image_uri (or at least is populated with a valid
 *           URI that we defined), implicitly validating media enrichment.
 *     - The non-blocking compliance flag does not prevent the product from appearing
 *           in the listing.
 */
export async function test_api_catalog_enriched_products_basic_listing(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authentication context)
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a generic policy setting profile
  const policySettingRequest = {
    code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: "Generic policy profile",
    category: "generic",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingRequest },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 3. Create cancellation policy
  const cancellationPolicyRequest = {
    code: `cancel_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default cancellation policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyRequest },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);

  // 4. Create refund policy
  const refundPolicyRequest = {
    code: `refund_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default refund policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyRequest },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);

  // 5. Create age restriction policy
  const agePolicyRequest = {
    code: `age_${RandomGenerator.alphaNumeric(8)}`,
    name: "Mild age restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 18,
    require_verified_age: false,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyRequest },
    );
  typia.assert<IShoppingMallAgeRestrictionPolicy>(agePolicy);

  // 6. Create region setting
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionRequest = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionRequest },
    );
  typia.assert<IShoppingMallRegionSetting>(region);

  // 7. Create category tree
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeRequest = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeRequest },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 8. Create a category under the tree
  const categoryRequest = {
    code: `cat_${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryRequest,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  // 9. Create brand
  const brandRequest = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandRequest,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 10. Create product
  const productCode = `prd_${RandomGenerator.alphaNumeric(10)}`;
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productRequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Basic Enriched Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product/main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productRequest },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 11. Assign primary category to product
  const assignmentRequest = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode,
        body: assignmentRequest,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  // 12. Create visibility rule for region + channel
  const channel = "web";
  const visibilityRuleRequest = {
    shopping_mall_region_setting_id: region.id,
    channel,
    visibility: "visible",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode,
        body: visibilityRuleRequest,
      },
    );
  typia.assert<IShoppingMallProductVisibilityRule>(visibilityRule);

  // 13. Create non-blocking compliance flag
  const complianceFlagRequest = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: false,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode,
        body: complianceFlagRequest,
      },
    );
  typia.assert<IShoppingMallProductComplianceFlag>(complianceFlag);

  // 14. Call enriched listing with filters
  const searchRequest = {
    page: 1,
    page_size: 10,
    sort_field: "created_at",
    sort_direction: "desc",
    keyword: undefined,
    status: undefined,
    seller_id: undefined,
    brand_id: brand.id,
    category_ids: [category.id],
    region_setting_id: region.id,
    channel,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const page: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.catalog.products.enriched.index(
      connection,
      { body: searchRequest },
    );
  typia.assert<IPageIShoppingMallProduct.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 15. Business assertions
  TestValidator.predicate(
    "pagination should report at least one record",
    pagination.records >= 1,
  );

  const matchedProduct = page.data.find((item) => item.id === product.id);

  TestValidator.predicate(
    "created product should appear in enriched listing",
    matchedProduct !== undefined,
  );

  if (matchedProduct !== undefined) {
    // Product name should match
    TestValidator.equals(
      "enriched summary product name should match created product name",
      matchedProduct.name,
      product.name,
    );

    // Brand summary should be present and match
    TestValidator.predicate(
      "brand summary should be present on enriched product",
      matchedProduct.brand !== undefined,
    );

    if (matchedProduct.brand !== undefined) {
      TestValidator.equals(
        "enriched product brand id should match created brand id",
        matchedProduct.brand.id,
        brand.id,
      );
    }

    // primary_image_url, if present, should be non-empty (format is already
    // validated by typia)
    if (matchedProduct.primary_image_url !== undefined) {
      TestValidator.predicate(
        "primary_image_url should be non-empty when present",
        matchedProduct.primary_image_url.length > 0,
      );
    }
  }

  // Ensure all returned products (if any) belong to the filtered brand,
  // because we filtered with brand_id.
  if (page.data.length > 0) {
    const allBrandMatches = page.data.every((item) => {
      return item.brand !== undefined && item.brand.id === brand.id;
    });

    TestValidator.predicate(
      "all enriched products in result should belong to filtered brand",
      allBrandMatches,
    );
  }
}
