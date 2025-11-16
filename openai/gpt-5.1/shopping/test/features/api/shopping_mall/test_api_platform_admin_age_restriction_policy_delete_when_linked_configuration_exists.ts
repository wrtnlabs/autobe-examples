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

/**
 * End-to-end test: delete an age restriction policy that is linked to
 * surrounding configuration (region + policy setting) and co-exists with other
 * policies using the same configuration.
 *
 * Business context: Platform admins can define shared configuration building
 * blocks like region settings and policy settings, and attach multiple policy
 * types to them (cancellation, refund, age restriction). Deleting a single age
 * restriction policy should still be allowed even if other policies and
 * configuration entries referencing the same region/policy-setting remain. This
 * test verifies that behavior and the basic API contract.
 *
 * Steps:
 *
 * 1. Join as a platform admin to obtain an authenticated admin session.
 * 2. Create a policy setting profile that other policies will reference.
 * 3. Create a region setting representing where policies apply.
 * 4. Create a cancellation policy referencing the policy setting by code.
 * 5. Create a refund policy referencing both the policy setting and the region by
 *    codes.
 * 6. Create an age restriction policy associated with the same region and policy
 *    setting by UUID ids.
 * 7. Assert that the created age restriction policy response includes non-null
 *    regionSetting and policySetting summaries whose codes match the earlier
 *    configuration objects.
 * 8. Delete the age restriction policy by its business code via the DELETE
 *    endpoint.
 * 9. Confirm the delete call completes successfully (no error) and returns void,
 *    relying on the SDK contract instead of explicit HTTP status checks.
 */
export async function test_api_platform_admin_age_restriction_policy_delete_when_linked_configuration_exists(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile
  const policySettingCode = `age_policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Age restriction shared profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingBody,
      },
    );
  typia.assert(policySetting);

  // 3. Create a region setting
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "Test Region for Age Restriction",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Create a cancellation policy referencing the policy setting by code
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationPolicyCode,
    name: "Cancellation w/ shared policy setting",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationBody,
      },
    );
  typia.assert(cancellationPolicy);

  // 5. Create a refund policy referencing both policy setting and region by codes
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundBody = {
    code: refundPolicyCode,
    name: "Refund policy w/ shared config",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundBody,
      },
    );
  typia.assert(refundPolicy);

  // 6. Create an age restriction policy linked to region + policy setting
  const ageRestrictionCode = `age_${RandomGenerator.alphaNumeric(8)}`;
  const ageRestrictionBody = {
    code: ageRestrictionCode,
    name: "Adult only (linked to region & profile)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 19,
    require_verified_age: true,
    config_payload: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: ageRestrictionBody,
      },
    );
  typia.assert(agePolicy);

  // 7. Validate that regionSetting and policySetting summaries are populated
  TestValidator.predicate(
    "age restriction policy should have non-null regionSetting",
    agePolicy.regionSetting !== null && agePolicy.regionSetting !== undefined,
  );
  TestValidator.predicate(
    "age restriction policy should have non-null policySetting",
    agePolicy.policySetting !== null && agePolicy.policySetting !== undefined,
  );

  if (
    agePolicy.regionSetting !== null &&
    agePolicy.regionSetting !== undefined
  ) {
    TestValidator.equals(
      "regionSetting.code must match created region code",
      agePolicy.regionSetting.code,
      region.code,
    );
  }

  if (
    agePolicy.policySetting !== null &&
    agePolicy.policySetting !== undefined
  ) {
    TestValidator.equals(
      "policySetting.code must match created policy setting code",
      agePolicy.policySetting.code,
      policySetting.code,
    );
  }

  // 8. Delete the age restriction policy by its code
  await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.erase(
    connection,
    {
      ageRestrictionPolicyCode: agePolicy.code,
    },
  );

  // 9. If we reach this point, deletion succeeded without error; no body to assert
  TestValidator.predicate(
    "deletion call for age restriction policy completed without throwing",
    true,
  );
}
