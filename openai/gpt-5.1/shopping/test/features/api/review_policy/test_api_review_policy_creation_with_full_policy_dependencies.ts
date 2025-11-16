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
 * Validate creation of a review policy with all dependent policy entities in
 * place.
 *
 * Business goal
 *
 * - Ensure a platform administrator can define a review policy that is correctly
 *   wired to shared policy configuration and region configuration, after
 *   creating all prerequisite policy entities.
 *
 * High level flow
 *
 * 1. Join as a new platform administrator using auth.platformAdmin.join.
 * 2. As this admin, create a policy setting profile (category "review") via
 *    shoppingMall.platformAdmin.policySettings.create.
 * 3. Create a region setting (e.g. code "EU_MARKET") via
 *    shoppingMall.platformAdmin.regionSettings.create.
 * 4. Create a cancellation policy that references the policy setting by its
 *    business code.
 * 5. Create a refund policy that references the same policy setting and uses a
 *    realistic refund window and maxRefundRate.
 * 6. Create an age restriction policy that links to the region and policy setting
 *    using their UUID identifiers.
 * 7. Finally, create a review policy whose payload:
 *
 *    - Has a unique code and descriptive name,
 *    - Sets max_days_after_delivery_for_review, allow_edit_within_days and
 *         auto_hide_report_threshold to realistic positive values,
 *    - Sets active=true,
 *    - Uses effective_from/effective_to in a near-future window,
 *    - References the region and policy setting via their UUID ids.
 * 8. Assert that the created review policy matches expectations:
 *
 *    - Code and name match the request,
 *    - Active is true,
 *    - Numeric configuration fields are preserved,
 *    - Effective_from/effective_to are not null when we sent them,
 *    - Region_setting and policy_setting are defined and their id fields equal the
 *         region/policy-setting created earlier,
 *    - Created_at and updated_at are non-empty strings and deleted_at is null.
 */
export async function test_api_review_policy_creation_with_full_policy_dependencies(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "Admin1234!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin must be active",
    admin.isActive === true,
  );

  // 2. Create shared policy setting profile (category "review")
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const effectiveTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingCode = `review_profile_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingCreate = {
    code: policySettingCode,
    name: "Default Review Policy Setting",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({
      moderationMode: "standard",
      maxReportsBeforeEscalation: 5,
    }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingCreate,
      },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "created policy setting code should match request",
    policySetting.code,
    policySettingCode,
  );
  TestValidator.predicate(
    "policy setting should be active",
    policySetting.active === true,
  );

  // 3. Create region setting (e.g., EU_MARKET)
  const regionCode = `EU_${RandomGenerator.alphaNumeric(6)}`;
  const regionCreate = {
    code: regionCode,
    name: "EU Market",
    iso_country_code: null,
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreate,
      },
    );
  typia.assert(region);
  TestValidator.equals(
    "created region setting code should match request",
    region.code,
    regionCode,
  );
  TestValidator.predicate("region should be active", region.active === true);

  // 4. Create cancellation policy referencing policy setting by code
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(6)}`;
  const maxHoursAfterPayment = 24;

  const cancellationCreate = {
    code: cancellationCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: maxHoursAfterPayment,
    config_payload: JSON.stringify({ windowHours: maxHoursAfterPayment }),
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationCreate,
      },
    );
  typia.assert(cancellationPolicy);
  TestValidator.equals(
    "cancellation policy should reference region by code",
    cancellationPolicy.region_setting?.code ?? null,
    regionCode,
  );
  TestValidator.equals(
    "cancellation policy should reference policy setting by code",
    cancellationPolicy.policy_setting?.code ?? null,
    policySettingCode,
  );

  // 5. Create refund policy referencing same policy setting and region
  const refundCode = `refund_${RandomGenerator.alphaNumeric(6)}`;
  const refundWindowDays = 14;
  const maxRefundRate = 0.8;

  const refundCreate = {
    code: refundCode,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays,
    maxRefundRate,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      mode: "standard",
      restockingFeeRate: 0.1,
    }),
    isActive: true,
    effectiveFrom,
    effectiveUntil: effectiveTo,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundCreate,
      },
    );
  typia.assert(refundPolicy);
  TestValidator.equals(
    "refund policy should have configured maxRefundRate",
    refundPolicy.maxRefundRate ?? null,
    maxRefundRate,
  );
  TestValidator.equals(
    "refund policy should expose regionCode",
    refundPolicy.regionCode ?? null,
    regionCode,
  );
  TestValidator.equals(
    "refund policy should expose policySettingCode",
    refundPolicy.policySettingCode ?? null,
    policySettingCode,
  );

  // 6. Create age restriction policy linking to region and policy setting via UUIDs
  const agePolicyCode = `age_${RandomGenerator.alphaNumeric(6)}`;
  const minimumAgeYears = 18;

  const ageRestrictionCreate = {
    code: agePolicyCode,
    name: "Adult Only",
    description: "18+ only policy for age-restricted content",
    minimum_age_years: minimumAgeYears,
    require_verified_age: true,
    config_payload: JSON.stringify({ strict: true }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: ageRestrictionCreate,
      },
    );
  typia.assert(ageRestrictionPolicy);
  TestValidator.equals(
    "age restriction policy should reference region by id",
    ageRestrictionPolicy.regionSetting?.id ?? null,
    region.id,
  );
  TestValidator.equals(
    "age restriction policy should reference policy setting by id",
    ageRestrictionPolicy.policySetting?.id ?? null,
    policySetting.id,
  );

  // 7. Create review policy that references region and policy setting via UUIDs
  const reviewPolicyCode = `review_${RandomGenerator.alphaNumeric(6)}`;
  const maxDaysAfterDelivery = 30;
  const allowEditWithinDays = 7;
  const autoHideThreshold = 5;

  const reviewCreate = {
    code: reviewPolicyCode,
    name: "EU Strict Review Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: maxDaysAfterDelivery,
    allow_edit_within_days: allowEditWithinDays,
    auto_hide_report_threshold: autoHideThreshold,
    config_payload: JSON.stringify({
      languageFilter: "strict",
      minRating: 1,
    }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      {
        body: reviewCreate,
      },
    );
  typia.assert(reviewPolicy);

  // 8. Validate created review policy fields
  TestValidator.equals(
    "review policy code should match request",
    reviewPolicy.code,
    reviewPolicyCode,
  );
  TestValidator.equals(
    "review policy name should match request",
    reviewPolicy.name,
    "EU Strict Review Policy",
  );
  TestValidator.predicate(
    "review policy should be active",
    reviewPolicy.active === true,
  );
  TestValidator.equals(
    "review policy max_days_after_delivery_for_review should persist",
    reviewPolicy.max_days_after_delivery_for_review ?? null,
    maxDaysAfterDelivery,
  );
  TestValidator.equals(
    "review policy allow_edit_within_days should persist",
    reviewPolicy.allow_edit_within_days ?? null,
    allowEditWithinDays,
  );
  TestValidator.equals(
    "review policy auto_hide_report_threshold should persist",
    reviewPolicy.auto_hide_report_threshold ?? null,
    autoHideThreshold,
  );

  TestValidator.equals(
    "review policy effective_from should match input",
    reviewPolicy.effective_from ?? null,
    effectiveFrom,
  );
  TestValidator.equals(
    "review policy effective_to should match input",
    reviewPolicy.effective_to ?? null,
    effectiveTo,
  );

  // Verify region and policy-setting associations
  TestValidator.equals(
    "review policy should embed region_setting with expected id",
    reviewPolicy.region_setting?.id ?? null,
    region.id,
  );
  TestValidator.equals(
    "review policy should embed region_setting with expected code",
    reviewPolicy.region_setting?.code ?? null,
    regionCode,
  );
  TestValidator.equals(
    "review policy should embed policy_setting with expected id",
    reviewPolicy.policy_setting?.id ?? null,
    policySetting.id,
  );
  TestValidator.equals(
    "review policy should embed policy_setting with expected code",
    reviewPolicy.policy_setting?.code ?? null,
    policySettingCode,
  );

  // 9. Lifecycle timestamp sanity checks
  TestValidator.predicate(
    "review policy created_at should be a non-empty string",
    typeof reviewPolicy.created_at === "string" &&
      reviewPolicy.created_at.length > 0,
  );
  TestValidator.predicate(
    "review policy updated_at should be a non-empty string",
    typeof reviewPolicy.updated_at === "string" &&
      reviewPolicy.updated_at.length > 0,
  );
  TestValidator.equals(
    "review policy deleted_at should be null",
    reviewPolicy.deleted_at ?? null,
    null,
  );
}
