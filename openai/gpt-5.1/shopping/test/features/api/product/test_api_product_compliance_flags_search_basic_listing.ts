import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductComplianceFlag";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_compliance_flags_search_basic_listing(
  connection: api.IConnection,
) {
  // 1. Platform admin join & implicit authentication
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Region setting for age policy
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionCreateBody = {
    code: regionCode,
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

  // 3. Policy setting to attach to age restriction policy
  const policySettingCode = `POLICY_${RandomGenerator.alphaNumeric(10)}`;
  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Default Age Policy Setting",
    category: "age_restriction",
    description: "Policy setting for age restriction tests",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 4. Cancellation policy (supplementary)
  const cancellationPolicyCode = `CANCEL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy",
    description: null,
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: null,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Refund policy (supplementary)
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
    description: "Refund policy for compliance flag listing test",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(refundPolicy);

  // 6. Category tree (not directly used by product/compliance, but part of setup)
  const categoryTreeCode = `TREE_${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Default Category Tree",
    description: "Tree for compliance listing test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 7. Brand to associate with the product
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: brandSlug,
    description: "Brand for compliance listing test",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 8. Age restriction policy referencing region & policy setting
  const agePolicyCode = `AGE_${RandomGenerator.alphaNumeric(8)}`;
  const agePolicyCreateBody = {
    code: agePolicyCode,
    name: "Adult Only",
    description: "18+ only policy",
    minimum_age_years: 18 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyCreateBody },
    );
  typia.assert(agePolicy);

  // 9. Create product
  const productCode = `PROD_${RandomGenerator.alphaNumeric(10)}`;

  // NOTE: We do not have seller creation here, so rely on a random UUID-like string.
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const productCreateBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: "Short description for compliance flag listing test",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
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
    "created product code should match request",
    product.code,
    productCode,
  );

  // 10. Create compliance flags for the product
  // 10-1. Blocking age_restriction flag linked to age policy
  const ageFlagValue = "adult_only";
  const ageFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: ageFlagValue,
    is_blocking_sale: true,
    notes: "Age restriction required for this product",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const ageFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: ageFlagCreateBody,
      },
    );
  typia.assert(ageFlag);

  TestValidator.equals(
    "age restriction flag should be blocking",
    ageFlag.is_blocking_sale,
    true,
  );

  // 10-2. Non-blocking hazardous_material flag without policy linkage
  const hazardousFlagValue = "hazmat_test";
  const hazardousFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "hazardous_material",
    flag_value: hazardousFlagValue,
    is_blocking_sale: false,
    notes: "Hazardous material info only, non-blocking",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const hazardousFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: hazardousFlagCreateBody,
      },
    );
  typia.assert(hazardousFlag);

  TestValidator.equals(
    "hazardous material flag should be non-blocking",
    hazardousFlag.is_blocking_sale,
    false,
  );

  // 11. List compliance flags for the product with basic pagination and no filters
  const requestPage: number & tags.Type<"int32"> = 1 as number &
    tags.Type<"int32">;
  const requestLimit: number & tags.Type<"int32"> = 10 as number &
    tags.Type<"int32">;

  const listRequestBody = {
    page: requestPage,
    limit: requestLimit,
    flag_type: null,
    is_blocking_sale: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallProductComplianceFlag.IRequest;

  const page: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be at least the number of items in current page",
    pagination.records >= page.data.length,
  );

  // Ensure at least two flags exist for this product in the returned page
  TestValidator.predicate(
    "page should contain at least two compliance flags for the product",
    page.data.length >= 2,
  );

  // Find summaries for the two created flags
  const ageSummary = page.data.find((f) => f.id === ageFlag.id);
  const hazardousSummary = page.data.find((f) => f.id === hazardousFlag.id);

  TestValidator.predicate(
    "listing should include age restriction flag",
    () => ageSummary !== undefined,
  );
  TestValidator.predicate(
    "listing should include hazardous material flag",
    () => hazardousSummary !== undefined,
  );

  if (ageSummary !== undefined) {
    TestValidator.equals(
      "age summary flag_type should match",
      ageSummary.flag_type,
      ageFlag.flag_type,
    );
    TestValidator.equals(
      "age summary is_blocking_sale should be true",
      ageSummary.is_blocking_sale,
      true,
    );
    TestValidator.equals(
      "age summary flag_value should match",
      ageSummary.flag_value,
      ageFlagValue,
    );
  }

  if (hazardousSummary !== undefined) {
    TestValidator.equals(
      "hazardous summary flag_type should match",
      hazardousSummary.flag_type,
      hazardousFlag.flag_type,
    );
    TestValidator.equals(
      "hazardous summary is_blocking_sale should be false",
      hazardousSummary.is_blocking_sale,
      false,
    );
    TestValidator.equals(
      "hazardous summary flag_value should match",
      hazardousSummary.flag_value,
      hazardousFlagValue,
    );
  }
}
