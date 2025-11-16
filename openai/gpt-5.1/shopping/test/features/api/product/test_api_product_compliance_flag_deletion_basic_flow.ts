import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
 * Basic happy-path flow for deleting a product compliance flag as a platform
 * admin.
 *
 * This scenario wires together all realistic prerequisites:
 *
 * - A platform admin account is registered and authenticated.
 * - Core policy/config entities are created (policy setting, region, cancellation
 *   policy, refund policy, age restriction policy).
 * - Catalog context is prepared (category tree, category, brand).
 * - A product is created under a dummy seller and associated brand.
 * - A compliance flag is attached to that product, linked to the age restriction
 *   policy.
 *
 * Finally, the test calls the DELETE
 * /shoppingMall/platformAdmin/products/{productCode}/complianceFlags/{productComplianceFlagId}
 * via api.functional.shoppingMall.platformAdmin.products.complianceFlags.erase
 * using the created product code and compliance flag id. The test passes if all
 * calls succeed without throwing.
 */
export async function test_api_product_compliance_flag_deletion_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context (token handled by SDK)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Default Policy Setting",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create a region setting
  const regionCode = "KR";
  const regionBody = {
    code: regionCode,
    name: "Korea",
    iso_country_code: regionCode,
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 4. Create a cancellation policy referencing the region and policy setting by code
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24 satisfies number & tags.Type<"int32">,
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
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create a refund policy referencing the same region and policy setting
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 satisfies number &
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
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 6. Create an age restriction policy linked to the region and policy setting
  const agePolicyCode = `age_${RandomGenerator.alphaNumeric(8)}`;
  const agePolicyBody = {
    code: agePolicyCode,
    name: "Adult Only",
    description: "Over 19 only",
    minimum_age_years: 19 satisfies number & tags.Type<"int32">,
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
      { body: agePolicyBody },
    );
  typia.assert(agePolicy);

  // 7. Create category tree and category for realistic catalog context
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Main Catalog",
    description: "Main catalog tree",
    active: true,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const categoryBody = {
    code: `cat_${RandomGenerator.alphaNumeric(4)}`,
    name: "General",
    description: "General category",
    displayOrder: 1 satisfies number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 8. Create a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: "Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 9. Create a product, using a random seller id (seller creation not in scope)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 10. Create a compliance flag for this product, linked to the age policy
  const complianceBody = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: agePolicy.code,
    is_blocking_sale: true,
    notes: "Adult only product",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: complianceBody,
      },
    );
  typia.assert(complianceFlag);

  // 11. Delete the created compliance flag (target of this test)
  await api.functional.shoppingMall.platformAdmin.products.complianceFlags.erase(
    connection,
    {
      productCode: product.code,
      productComplianceFlagId: complianceFlag.id,
    },
  );

  // If the erase call completes without throwing, the basic deletion flow is validated.
}
