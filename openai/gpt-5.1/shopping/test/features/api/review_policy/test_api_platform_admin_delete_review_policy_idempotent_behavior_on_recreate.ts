import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

/**
 * Validate that deleting a review policy by its business code frees the unique
 * constraint so that a new review policy can be recreated with the same code
 * under a platform admin context.
 *
 * Business context: Platform administrators manage global review policies that
 * control when and how customers can submit and edit product reviews. Each
 * policy is identified by a unique business code enforced at the database
 * level. When an obsolete policy is deleted, the platform should allow reusing
 * the same business code for a fresh policy definition, effectively freeing the
 * previously occupied unique-code slot.
 *
 * This test exercises the full administrative workflow: establishing a platform
 * admin session, creating dependent region/policy-setting configuration,
 * defining surrounding cancellation and refund policies for a realistic
 * environment, creating an age restriction policy, then creating a review
 * policy, deleting it by its code, and finally recreating a new review policy
 * with the identical business code.
 *
 * Steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join
 *
 *    - Use a random but valid email and URIs for href/referrer via typia tags
 *    - Let the SDK manage Authorization headers for subsequent calls
 * 2. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings
 *
 *    - Body: IShoppingMallRegionSetting.ICreate with unique code and name,
 *         active=true, and optional ISO/currency/timezone filled with realistic
 *         test values
 * 3. Create a policy setting profile via POST
 *    /shoppingMall/platformAdmin/policySettings
 *
 *    - Body: IShoppingMallPolicySetting.ICreate with unique code/category (e.g.,
 *         "review"), name, active=true, and a simple JSON string payload
 * 4. Create a cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies
 *
 *    - Body: IShoppingMallCancellationPolicy.ICreate
 *
 *         - Code/name unique
 *         - Allow_cancellation_before_shipment=true
 *         - Allow_partial_cancellation=true
 *         - Optional timing and config fields populated
 *         - Region_code and policy_setting_code referencing the region/policy setting
 *                   codes created in steps 2 and 3
 * 5. Create a refund policy via POST /shoppingMall/platformAdmin/refundPolicies
 *
 *    - Body: IShoppingMallRefundPolicy.ICreate
 *
 *         - Code/name unique
 *         - Sensible numeric values for refundWindowDays and maxRefundRate
 *         - AllowFullRefund/allowPartialRefund flags set
 *         - IsActive=true, effectiveFrom/effectiveUntil null or set to now
 *         - RegionCode and policySettingCode referencing the same region/policy setting
 *                   codes
 * 6. Create an age restriction policy via POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies
 *
 *    - Body: IShoppingMallAgeRestrictionPolicy.ICreate
 *
 *         - Code/name unique
 *         - Minimum_age_years set to a realistic value (e.g., 19)
 *         - Require_verified_age boolean
 *         - Active=true, effective_from/effective_to null or simple timestamps
 *         - Region_setting_id and policy_setting_id referencing IDs from step 2 and 3
 *                   responses
 * 7. Choose a deterministic review policy business code constant, e.g. const
 *    reviewPolicyCode = "REVIEW_POLICY_CODE_IDEMPOTENT_TEST";
 * 8. Create initial review policy via POST
 *    /shoppingMall/platformAdmin/reviewPolicies
 *
 *    - Body: IShoppingMallReviewPolicy.ICreate
 *
 *         - Code: reviewPolicyCode
 *         - Name/description generated text
 *         - Active=true, numeric fields like max_days_after_delivery_for_review and
 *                   allow_edit_within_days populated with small int32 values
 *         - Auto_hide_report_threshold set or left null
 *         - Config_payload simple JSON string
 *         - Effective_from/effective_to null or simple timestamps
 *         - Shopping_mall_region_setting_id and shopping_mall_policy_setting_id
 *                   referencing IDs from step 2 and 3
 *    - Assert: typia.assert() on the response and TestValidator.equals("created
 *         review policy code matches input", created.code, reviewPolicyCode)
 * 9. Delete the review policy via DELETE
 *    /shoppingMall/platformAdmin/reviewPolicies/{reviewPolicyCode}
 *
 *    - Call api.functional.shoppingMall.platformAdmin.reviewPolicies.erase with the
 *         same reviewPolicyCode
 *    - Ensure the call does not throw (no explicit status validation)
 * 10. Recreate a new review policy with the exact same code
 *
 *     - Call the same create endpoint with a second body (different name or
 *           description is fine) but `code` equal to reviewPolicyCode
 *     - Assert: typia.assert() and TestValidator.equals("recreated review policy code
 *           matches reused code", recreated.code, reviewPolicyCode)
 *
 * Final assertion:
 *
 * - The test completes successfully with both the initial creation and the
 *   post-deletion recreation of a review policy using the same code, without
 *   any uniqueness or conflict errors surfaced by the SDK.
 */
export async function test_api_platform_admin_delete_review_policy_idempotent_behavior_on_recreate(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinRequest = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a region setting
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionCreate = {
    code: regionCode,
    name: "Test Region for Review Policy Idempotency",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);
  TestValidator.equals(
    "created region code must match input code",
    region.code,
    regionCode,
  );

  // 3. Create a policy setting profile
  const policySettingCode = `POLICY_SETTING_${RandomGenerator.alphaNumeric(8)}`;
  const nowIso = new Date().toISOString();
  const policySettingCreate = {
    code: policySettingCode,
    name: "Review Policy Setting Profile for Idempotent Delete Test",
    category: "review",
    description:
      "Policy setting profile used in review policy delete/recreate idempotency test.",
    config_payload: JSON.stringify({
      feature: "review",
      variant: "idempotent-delete",
    }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "created policy setting code must match input code",
    policySetting.code,
    policySettingCode,
  );

  // 4. Create a cancellation policy referencing region and policy setting by code
  const cancellationPolicyCode = `CANCEL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreate = {
    code: cancellationPolicyCode,
    name: "Cancellation Policy for Review Policy Idempotent Test",
    description:
      "Allows pre-shipment and partial cancellations for idempotent review policy test.",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ reason: "test-flow" }),
    effective_from: nowIso,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreate },
    );
  typia.assert(cancellationPolicy);
  TestValidator.equals(
    "created cancellation policy code must match input code",
    cancellationPolicy.code,
    cancellationPolicyCode,
  );

  // 5. Create a refund policy referencing same region/policy setting by code
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreate = {
    code: refundPolicyCode,
    name: "Refund Policy for Review Policy Idempotent Test",
    description:
      "Refund policy associated with the idempotent review policy scenario.",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      scenario: "review-policy-idempotent",
    }),
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert(refundPolicy);
  TestValidator.equals(
    "created refund policy code must match input code",
    refundPolicy.code,
    refundPolicyCode,
  );

  // 6. Create an age restriction policy referencing region/policy setting by id
  const ageRestrictionPolicyCode = `AGE_${RandomGenerator.alphaNumeric(8)}`;
  const ageRestrictionCreate = {
    code: ageRestrictionPolicyCode,
    name: "Age Restriction Policy for Review Policy Idempotent Test",
    description:
      "Requires adult-only access for the idempotent review policy scenario.",
    minimum_age_years: 19 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: JSON.stringify({ document: "id-card" }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionCreate },
    );
  typia.assert(ageRestrictionPolicy);
  TestValidator.equals(
    "created age restriction policy code must match input code",
    ageRestrictionPolicy.code,
    ageRestrictionPolicyCode,
  );

  // 7. Deterministic review policy business code
  const reviewPolicyCode = "REVIEW_POLICY_CODE_IDEMPOTENT_TEST";

  // 8. Create initial review policy
  const reviewCreate1 = {
    code: reviewPolicyCode,
    name: "Initial Review Policy for Idempotent Delete/Recreate Test",
    description:
      "First incarnation of review policy using a reusable business code.",
    max_days_after_delivery_for_review: 14 as number & tags.Type<"int32">,
    allow_edit_within_days: 7 as number & tags.Type<"int32">,
    auto_hide_report_threshold: 5 as number & tags.Type<"int32">,
    config_payload: JSON.stringify({ variant: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const createdReviewPolicy1: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewCreate1 },
    );
  typia.assert(createdReviewPolicy1);
  TestValidator.equals(
    "initial created review policy code must match requested code",
    createdReviewPolicy1.code,
    reviewPolicyCode,
  );

  // 9. Delete the review policy by its business code
  await api.functional.shoppingMall.platformAdmin.reviewPolicies.erase(
    connection,
    { reviewPolicyCode },
  );

  // 10. Recreate a new review policy with the same business code
  const reviewCreate2 = {
    code: reviewPolicyCode,
    name: "Recreated Review Policy after Deletion",
    description:
      "Second incarnation of review policy reusing the same business code after delete.",
    max_days_after_delivery_for_review: 21 as number & tags.Type<"int32">,
    allow_edit_within_days: 10 as number & tags.Type<"int32">,
    auto_hide_report_threshold: null,
    config_payload: JSON.stringify({ variant: 2 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const createdReviewPolicy2: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewCreate2 },
    );
  typia.assert(createdReviewPolicy2);
  TestValidator.equals(
    "recreated review policy code must match reused business code",
    createdReviewPolicy2.code,
    reviewPolicyCode,
  );
}
