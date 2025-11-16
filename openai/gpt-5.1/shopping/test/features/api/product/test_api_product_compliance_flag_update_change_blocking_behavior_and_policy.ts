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
 * Validate updating a product compliance flag to change blocking behavior and
 * age restriction policy.
 *
 * Business goal
 *
 * - Ensure a platform admin can reconfigure an existing product compliance flag
 *   so that it (a) continues to belong to the same product, (b) switches to a
 *   different age restriction policy, and (c) toggles its is_blocking_sale flag
 *   and human-readable metadata (notes/flag_value), while preserving created_at
 *   and only bumping updated_at.
 *
 * High-level flow
 *
 * 1. Join as a new platform admin and let the SDK attach the admin JWT to the
 *    connection.
 * 2. As the admin, create a policy setting profile that downstream policies can
 *    reference.
 * 3. Create a cancellation policy and refund policy that reference the policy
 *    setting profile (they are not directly used by the compliance flag but
 *    exercise the shared policy-setting dependency surface).
 * 4. Create a region setting and then two age restriction policies (Policy A and
 *    Policy B) in that region and attached to the policy setting, so we have
 *    two distinct policy ids.
 * 5. Create a category tree and a brand, then create a product that references the
 *    brand.
 * 6. Create an initial product compliance flag for that product, pointing to
 *    Policy A and is_blocking_sale=true, with some initial flag_value and notes
 *    text.
 * 7. Call the PUT
 *    /shoppingMall/platformAdmin/products/{productCode}/complianceFlags/{productComplianceFlagId}
 *    endpoint to update that flag:
 *
 *    - Swap shopping_mall_age_restriction_policy_id from Policy A to Policy B,
 *    - Set is_blocking_sale=false,
 *    - Update flag_value and notes to new values.
 * 8. Assert the PUT response:
 *
 *    - Id is identical to the original flag id,
 *    - Shopping_mall_product_id is identical to the original flag and matches the
 *         created product id,
 *    - Shopping_mall_age_restriction_policy_id equals Policy B id,
 *    - Is_blocking_sale is false,
 *    - Flag_value and notes match the new values,
 *    - Created_at is unchanged and updated_at is strictly greater than the original
 *         updated_at.
 *
 * Implementation details
 *
 * - Use deterministic-ish but random-ish values via RandomGenerator and
 *   typia.random with tags (e.g., emails, UUIDs, URIs, date-time strings) but
 *   ensure they satisfy DTO constraints.
 * - For IShoppingMallPlatformAdminJoin.IRequest, build a body with explicit
 *   email/name/password, plus href/referrer as URL strings; ip can be omitted.
 * - For IShoppingMallPolicySetting.ICreate, choose a unique code and category
 *   (e.g., "age_restriction"), and mark active=true with null
 *   effective_from/effective_to.
 * - For IShoppingMallCancellationPolicy.ICreate and
 *   IShoppingMallRefundPolicy.ICreate, pass a policy_setting_code/regionCode
 *   that references the created policy setting / region where applicable.
 * - For IShoppingMallRegionSetting.ICreate, choose a unique region code like
 *   "REGION-<random>" and set active=true; other fields optional.
 * - For IShoppingMallAgeRestrictionPolicy.ICreate, create Policy A and Policy B
 *   both active and in the same region/policy setting; differentiate them by
 *   code/name/description and minimum_age_years.
 * - For IShoppingMallCategoryTree.ICreate, create a minimal active tree with a
 *   unique code and a defaultLocale.
 * - For IShoppingMallBrand.ICreate, create a minimal brand with name/slug and
 *   optional description/logo.
 * - For IShoppingMallProduct.ICreate, point shopping_mall_seller_id to some
 *   random UUID (the seller summary is part of the response; seller existence
 *   is accepted at face value for this test) and shopping_mall_brand_id to the
 *   created brand id; pick a unique product code and other required fields.
 * - For IShoppingMallProductComplianceFlag.ICreate, set flag_type to e.g.
 *   "age_restriction", shopping_mall_age_restriction_policy_id to Policy A id,
 *   is_blocking_sale=true, and some notes/value.
 * - The update body must be an IShoppingMallProductComplianceFlag.IUpdate with
 *   only the fields we intend to change:
 *   shopping_mall_age_restriction_policy_id, is_blocking_sale, flag_value,
 *   notes.
 * - Use typia.assert() for all non-void responses to ensure they conform to their
 *   DTOs.
 * - For equality checks and temporal comparisons, use
 *   TestValidator.equals/notEquals/predicate with descriptive titles. For
 *   created_at vs updated_at, compare strings lexicographically or construct
 *   Date objects to assert that updated_at > original updated_at.
 */
export async function test_api_product_compliance_flag_update_change_blocking_behavior_and_policy(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create policy setting profile (base configuration)
  const policySettingCode = `policy-${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Age restriction base profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
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

  // 3. Create cancellation policy referencing policy setting (and later region)
  // Region needed first for region_code, so create region setting now.
  const regionCode = `REGION-${RandomGenerator.alphaNumeric(6)}`;
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

  const cancellationPolicyCode = `cancel-${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationPolicyCode,
    name: "Standard cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48 as number & tags.Type<"int32">,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy referencing policy setting and region
  const refundPolicyCode = `refund-${RandomGenerator.alphaNumeric(8)}`;
  const refundBody = {
    code: refundPolicyCode,
    name: "Standard refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;
  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 5. Create two age restriction policies (Policy A and Policy B) in same region/policy setting
  const agePolicyABody = {
    code: `ageA-${RandomGenerator.alphaNumeric(6)}`,
    name: "Age Policy A",
    description: "Policy A - 18+ with verification",
    minimum_age_years: 18 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;
  const agePolicyA: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyABody },
    );
  typia.assert(agePolicyA);

  const agePolicyBBody = {
    code: `ageB-${RandomGenerator.alphaNumeric(6)}`,
    name: "Age Policy B",
    description: "Policy B - 21+ with verification",
    minimum_age_years: 21 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;
  const agePolicyB: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyBBody },
    );
  typia.assert(agePolicyB);

  // 6. Create category tree (not directly used by flag, but realistic catalog prerequisite)
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 7. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/brand.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 8. Create product referencing brand (seller id is random UUID for test purposes)
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(2)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.png" as string &
        tags.Format<"uri">,
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

  TestValidator.equals("product code roundtrip", product.code, productCode);

  // 9. Create initial compliance flag for the product pointing to Policy A
  const initialFlagValue = "A-18+";
  const initialNotes = "Initial compliance flag pointing to Policy A";
  const flagCreateBody = {
    shopping_mall_age_restriction_policy_id: agePolicyA.id,
    flag_type: "age_restriction",
    flag_value: initialFlagValue,
    is_blocking_sale: true,
    notes: initialNotes,
  } satisfies IShoppingMallProductComplianceFlag.ICreate;
  const originalFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: flagCreateBody,
      },
    );
  typia.assert(originalFlag);

  TestValidator.equals(
    "original flag product linkage matches product id",
    originalFlag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "original flag policy id matches Policy A",
    originalFlag.shopping_mall_age_restriction_policy_id,
    agePolicyA.id,
  );
  TestValidator.predicate(
    "original flag is blocking sale",
    originalFlag.is_blocking_sale === true,
  );

  const originalFlagId = originalFlag.id;
  const originalProductId = originalFlag.shopping_mall_product_id;
  const originalCreatedAt = originalFlag.created_at;
  const originalUpdatedAt = originalFlag.updated_at;

  // 10. Update compliance flag to point to Policy B, stop blocking, and change notes/value
  const updatedFlagValue = "B-21+";
  const updatedNotes = "Updated to Policy B with relaxed blocking behavior";
  const flagUpdateBody = {
    shopping_mall_age_restriction_policy_id: agePolicyB.id,
    is_blocking_sale: false,
    flag_value: updatedFlagValue,
    notes: updatedNotes,
  } satisfies IShoppingMallProductComplianceFlag.IUpdate;
  const updatedFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.update(
      connection,
      {
        productCode: product.code,
        productComplianceFlagId: originalFlagId,
        body: flagUpdateBody,
      },
    );
  typia.assert(updatedFlag);

  // 11. Assertions on updated flag
  TestValidator.equals(
    "flag id remains unchanged after update",
    updatedFlag.id,
    originalFlagId,
  );
  TestValidator.equals(
    "updated flag product linkage is unchanged",
    updatedFlag.shopping_mall_product_id,
    originalProductId,
  );
  TestValidator.equals(
    "updated flag policy id now references Policy B",
    updatedFlag.shopping_mall_age_restriction_policy_id,
    agePolicyB.id,
  );
  TestValidator.predicate(
    "updated flag is no longer blocking sale",
    updatedFlag.is_blocking_sale === false,
  );
  TestValidator.equals(
    "updated flag_value reflects new value",
    updatedFlag.flag_value,
    updatedFlagValue,
  );
  TestValidator.equals(
    "updated notes reflect new text",
    updatedFlag.notes,
    updatedNotes,
  );

  // created_at should stay the same
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedFlag.created_at,
    originalCreatedAt,
  );

  // updated_at should be strictly greater than originalUpdatedAt. Compare via Date objects.
  const originalUpdatedDate = new Date(originalUpdatedAt);
  const updatedUpdatedDate = new Date(updatedFlag.updated_at);
  TestValidator.predicate(
    "updated_at is strictly greater than original updated_at",
    updatedUpdatedDate.getTime() > originalUpdatedDate.getTime(),
  );
}
