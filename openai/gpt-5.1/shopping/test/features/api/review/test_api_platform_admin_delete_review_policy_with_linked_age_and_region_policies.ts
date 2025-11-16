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
 * Validate deletion of a review policy that is configured in the same
 * region/policy-setting context as age restriction, cancellation and refund
 * policies.
 *
 * Business flow:
 *
 * 1. Platform admin joins (auth) and becomes the authenticated actor.
 * 2. Admin creates a region setting that will scope policies.
 * 3. Admin creates a shared policy setting profile.
 * 4. Admin creates a cancellation policy bound to region and policy setting.
 * 5. Admin creates a refund policy bound to the same region and policy setting.
 * 6. Admin creates an age restriction policy that references the concrete region
 *    setting id and policy setting id.
 * 7. Admin creates a review policy that also references the same region setting id
 *    and policy setting id so it is "linked" to the same context as the age
 *    restriction policy.
 * 8. Admin deletes the review policy by its business code.
 *
 * Expectations:
 *
 * - All create APIs succeed and return correctly typed entities.
 * - The review policy is linked to region and policy setting prior to deletion
 *   (non-null associations where exposed in summaries).
 * - The delete API completes without throwing any error, proving that such
 *   linkages do not block deletion in the happy path.
 */
export async function test_api_platform_admin_delete_review_policy_with_linked_age_and_region_policies(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create region setting used across policies
  const regionCode = `REGION_${RandomGenerator.alphabets(6)}`;
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

  // 3. Create a shared policy setting profile
  const policySettingCode = `PS_${RandomGenerator.alphabets(8)}`;
  const nowIso = new Date().toISOString();
  const profileBody = {
    code: policySettingCode,
    name: "Shared Policy Profile",
    category: "generic",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: profileBody },
    );
  typia.assert(policySetting);

  // 4. Create cancellation policy bound to region and policy setting by codes
  const cancellationCode = `CANCEL_${RandomGenerator.alphabets(6)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: "Test Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: nowIso,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create refund policy aligned with same region and policy setting
  const refundCode = `REFUND_${RandomGenerator.alphabets(6)}`;
  const refundBody = {
    code: refundCode,
    name: "Test Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: regionCode,
    policySettingCode: policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 6. Create age restriction policy linked via IDs to region and policy setting
  const agePolicyCode = `AGE_${RandomGenerator.alphabets(6)}`;
  const agePolicyBody = {
    code: agePolicyCode,
    name: "Adult Only",
    description: "Age restriction policy for adult-only content.",
    minimum_age_years: 19,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
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

  TestValidator.predicate(
    "age policy is linked to region and policy setting by summaries when provided",
    () => {
      const regionSummary = agePolicy.regionSetting ?? null;
      const policySummary = agePolicy.policySetting ?? null;
      return (
        (regionSummary === null || regionSummary.code === region.code) &&
        (policySummary === null || policySummary.code === policySetting.code)
      );
    },
  );

  // 7. Create review policy linked to same region/policy-setting by raw FK ids
  const reviewPolicyCode = `REVIEW_${RandomGenerator.alphabets(6)}`;
  const reviewBody = {
    code: reviewPolicyCode,
    name: "Default Review Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    max_days_after_delivery_for_review: 60,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewBody },
    );
  typia.assert(reviewPolicy);

  TestValidator.predicate(
    "review policy is associated with same region/policy-setting context as age policy",
    () => {
      const regionSummary = reviewPolicy.region_setting ?? null;
      const policySummary = reviewPolicy.policy_setting ?? null;
      return (
        (regionSummary === null || regionSummary.code === region.code) &&
        (policySummary === null || policySummary.code === policySetting.code)
      );
    },
  );

  // 8. Delete the review policy by its business code and ensure no error
  let deleteError: unknown = undefined;
  try {
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.erase(
      connection,
      { reviewPolicyCode: reviewPolicy.code },
    );
  } catch (err) {
    deleteError = err;
  }

  TestValidator.predicate(
    "deleting linked review policy succeeds without throwing",
    deleteError === undefined,
  );
}
