import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Validate creation of an age-restriction-oriented product compliance flag that
 * blocks sale.
 *
 * Business flow (platform admin only):
 *
 * 1. Join as platform admin to obtain an authorized session (JWT is stored in the
 *    connection by SDK).
 * 2. Create a base policy setting profile with category "age_restriction" to be
 *    reused by refund and age restriction policies.
 * 3. Create a refund policy that references the policy setting profile to exercise
 *    cross-policy configuration, even though the refund policy is not directly
 *    used by the compliance flag.
 * 4. Create a cancellation policy that references the region and policy setting
 *    structures to exercise region/policy-setting dependency behavior.
 * 5. Create a region setting used to scope the age restriction policy.
 * 6. Create an age restriction policy tied to the region and policy setting, with
 *    require_verified_age=true and active=true.
 * 7. Create a category tree to represent the catalog hierarchy (not strictly
 *    needed for the flag but part of realistic setup).
 * 8. Create a brand that will be associated with the test product.
 * 9. Create a product with a unique business product code associated with the
 *    brand and a synthetic seller.
 * 10. Create a product compliance flag via POST
 *     /shoppingMall/platformAdmin/products/{productCode}/complianceFlags that:
 *
 *     - Uses flag_type = "age_restriction",
 *     - Sets is_blocking_sale = true,
 *     - Links shopping_mall_age_restriction_policy_id to the age restriction policy
 *           id,
 *     - Optionally sets flag_value and notes.
 * 11. Assert response consistency: the returned IShoppingMallProductComplianceFlag
 *     has its id set, shopping_mall_product_id referencing the created product,
 *     shopping_mall_age_restriction_policy_id matching the policy id, flag_type
 *     and is_blocking_sale equal to the request, and created_at/updated_at
 *     present.
 *
 * All type/shape validation of responses is delegated to typia.assert, while
 * TestValidator is used for business rule equality checks.
 */
export async function test_api_product_compliance_flag_creation_with_age_restriction_policy(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (establishes Authorization header via SDK side effect)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "203.0.113.10",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create base policy setting profile (category age_restriction)
  const policySettingCode = `age-policy-${RandomGenerator.alphabets(8)}`;
  const policySettingCreate = {
    code: policySettingCode,
    name: "Age Restriction Base Policy",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "policy setting code echoes request",
    policySetting.code,
    policySettingCode,
  );

  // 3. Create refund policy referencing that policy setting (by policySettingCode)
  const refundPolicyCode = `refund-${RandomGenerator.alphabets(8)}`;
  const refundPolicyCreate = {
    code: refundPolicyCode,
    name: "Global Refund Policy for Age-Restricted Goods",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreate },
    );
  typia.assert(refundPolicy);
  TestValidator.equals(
    "refund policy is linked to policy setting code",
    refundPolicy.policySettingCode,
    policySettingCode,
  );

  // 4. Create region setting used later by cancellation and age restriction policies
  const regionCode = `REG-${RandomGenerator.alphabets(4).toUpperCase()}`;
  const regionCreate = {
    code: regionCode,
    name: "Test Region for Age Restrictions",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);
  TestValidator.equals("region code echoes request", region.code, regionCode);

  // 5. Create cancellation policy referencing region and policy setting by codes
  const cancellationPolicyCode = `cancel-${RandomGenerator.alphabets(8)}`;
  const cancellationPolicyCreate = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy for Age-Restricted Region",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 7,
    }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreate },
    );
  typia.assert(cancellationPolicy);
  if (
    cancellationPolicy.region_setting !== null &&
    cancellationPolicy.region_setting !== undefined
  ) {
    TestValidator.equals(
      "cancellation policy region matches created region",
      cancellationPolicy.region_setting.code,
      regionCode,
    );
  }
  if (
    cancellationPolicy.policy_setting !== null &&
    cancellationPolicy.policy_setting !== undefined
  ) {
    TestValidator.equals(
      "cancellation policy setting matches created policy setting",
      cancellationPolicy.policy_setting.code,
      policySettingCode,
    );
  }

  // 6. Create age restriction policy tied to region and policy setting
  const agePolicyCode = `age-${RandomGenerator.alphabets(8)}`;
  const agePolicyCreate = {
    code: agePolicyCode,
    name: "Adult Only Age Restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 19,
    require_verified_age: true,
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyCreate },
    );
  typia.assert(agePolicy);
  TestValidator.equals(
    "age restriction policy code echoes request",
    agePolicy.code,
    agePolicyCode,
  );

  // 7. Create category tree (catalog structure)
  const categoryTreeCode = `tree-${RandomGenerator.alphabets(8)}`;
  const categoryTreeCreate = {
    code: categoryTreeCode,
    name: "Main Catalog Tree for Age Restricted Products",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreate },
    );
  typia.assert(categoryTree);
  TestValidator.equals(
    "category tree code echoes request",
    categoryTree.code,
    categoryTreeCode,
  );

  // 8. Create brand
  const brandSlug = `brand-${RandomGenerator.alphabets(10)}`;
  const brandCreate = {
    name: "Age Restricted Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo/test-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);
  TestValidator.equals("brand slug echoes request", brand.slug, brandSlug);

  // 9. Create product associated with the brand.
  // Note: IShoppingMallProduct.ICreate requires shopping_mall_seller_id, but there's
  // no seller creation API in the provided list. Use a random UUID that compiles; the
  // backend may validate its existence at runtime, but the test focuses on the
  // compliance flag workflow using available types and functions.
  const productCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphabets(12)}`;
  const dummySellerId = typia.random<string & tags.Format<"uuid">>();

  const productCreate = {
    shopping_mall_seller_id: dummySellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Age Restricted Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/images/test-product.png",
    additional_data: JSON.stringify({ categoryTreeCode }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreate,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product code echoes request",
    product.code,
    productCode,
  );

  // 10. Create compliance flag for this product linked to the age restriction policy
  const flagNotes = RandomGenerator.paragraph({ sentences: 5 });
  const flagValue = "adult_only";
  const flagCreate = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: flagValue,
    is_blocking_sale: true,
    notes: flagNotes,
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const flag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode,
        body: flagCreate,
      },
    );
  typia.assert(flag);

  // 11. Business assertions on the created compliance flag
  TestValidator.equals(
    "compliance flag is attached to created product",
    flag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "compliance flag age restriction policy linkage matches",
    flag.shopping_mall_age_restriction_policy_id,
    agePolicy.id,
  );
  TestValidator.equals(
    "compliance flag type echoes request",
    flag.flag_type,
    flagCreate.flag_type,
  );
  TestValidator.equals(
    "compliance flag blocking sale echoes request",
    flag.is_blocking_sale,
    flagCreate.is_blocking_sale,
  );
  TestValidator.equals(
    "compliance flag value echoes request",
    flag.flag_value,
    flagValue,
  );
  TestValidator.equals(
    "compliance flag notes echoes request",
    flag.notes,
    flagNotes,
  );
}
