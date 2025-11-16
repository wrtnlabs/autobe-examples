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
 * Validate retrieval of an age restriction policy by business code for a
 * platform admin.
 *
 * Business context:
 *
 * - Platform administrators configure cross-cutting policies including generic
 *   policy settings, region settings, cancellation policies, refund policies,
 *   and age restriction policies.
 * - The GET
 *   /shoppingMall/platformAdmin/ageRestrictionPolicies/{ageRestrictionPolicyCode}
 *   endpoint must allow an authenticated platform admin to retrieve a single
 *   age restriction policy by its globally unique business code and must not
 *   mutate the policy.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authorized admin session; the SDK will set Authorization headers
 *    automatically.
 * 2. Create a policy setting profile (POST
 *    /shoppingMall/platformAdmin/policySettings) that is conceptually used for
 *    age restrictions (category "age_restriction").
 * 3. Create a cancellation policy and a refund policy to satisfy the scenario that
 *    other policy domains already exist in the environment (no deep
 *    cross-assertions needed).
 * 4. Create a region setting (POST /shoppingMall/platformAdmin/regionSettings)
 *    that can be associated with age restriction policies.
 * 5. Create an age restriction policy (POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies) with a unique business
 *    code and link it to the created region and policy setting by id.
 * 6. Retrieve the age restriction policy by its code using GET
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies/{ageRestrictionPolicyCode}.
 * 7. Assert that the retrieved policy matches the created policy in its core
 *    business properties (code, minimum_age_years, require_verified_age,
 *    active, config_payload) and that it is not soft-deleted.
 * 8. Assert that the associated regionSetting and policySetting summaries on the
 *    retrieved policy reflect the region and policy setting created earlier.
 */
export async function test_api_platform_admin_get_age_restriction_policy_by_code(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile for age restrictions
  const policySettingCode = `age_profile_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: `Age restriction profile ${RandomGenerator.alphabets(5)}`,
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({
      type: "age_restriction",
      notes: "E2E test policy setting for age restrictions",
    }),
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

  // 3. Create a cancellation policy (environmental context)
  const cancellationPolicyBody = {
    code: `cancel_${RandomGenerator.alphaNumeric(8)}`,
    name: `Cancellation policy ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: JSON.stringify({ reason: "e2e" }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create a refund policy (environmental context)
  const refundPolicyBody = {
    code: `refund_${RandomGenerator.alphaNumeric(8)}`,
    name: `Refund policy ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ reason: "e2e" }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 5. Create a region setting
  const regionCode = `AGE_REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: `Age Region ${RandomGenerator.alphabets(4)}`,
    iso_country_code: "KR",
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

  // 6. Create an age restriction policy linked to region and policy setting
  const agePolicyCode = `adult_only_e2e_${RandomGenerator.alphaNumeric(6)}`;
  const agePolicyBody = {
    code: agePolicyCode,
    name: `Adult only policy ${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: 19 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: JSON.stringify({
      age: 19,
      verified: true,
    }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const createdPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyBody },
    );
  typia.assert(createdPolicy);

  // 7. Retrieve the age restriction policy by code
  const fetchedPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.at(
      connection,
      { ageRestrictionPolicyCode: agePolicyCode },
    );
  typia.assert(fetchedPolicy);

  // 8. Business assertions
  TestValidator.equals(
    "fetched policy code matches created policy code",
    fetchedPolicy.code,
    createdPolicy.code,
  );

  TestValidator.equals(
    "minimum_age_years is consistent between create and fetch",
    fetchedPolicy.minimum_age_years,
    createdPolicy.minimum_age_years,
  );

  TestValidator.equals(
    "require_verified_age flag is preserved",
    fetchedPolicy.require_verified_age,
    createdPolicy.require_verified_age,
  );

  TestValidator.equals(
    "active flag remains true on fetched policy",
    fetchedPolicy.active,
    true,
  );

  TestValidator.equals(
    "config_payload remains consistent between create and fetch",
    fetchedPolicy.config_payload ?? null,
    createdPolicy.config_payload ?? null,
  );

  TestValidator.equals(
    "policy is not soft-deleted (deleted_at must be null)",
    fetchedPolicy.deleted_at ?? null,
    null,
  );

  // Region association checks
  if (
    createdPolicy.regionSetting !== undefined &&
    createdPolicy.regionSetting !== null
  ) {
    TestValidator.predicate(
      "fetched policy has a regionSetting when created policy does",
      fetchedPolicy.regionSetting !== null &&
        fetchedPolicy.regionSetting !== undefined,
    );

    if (
      fetchedPolicy.regionSetting !== null &&
      fetchedPolicy.regionSetting !== undefined
    ) {
      TestValidator.equals(
        "regionSetting.id matches created region id",
        fetchedPolicy.regionSetting.id,
        region.id,
      );
      TestValidator.equals(
        "regionSetting.code matches created region code",
        fetchedPolicy.regionSetting.code,
        region.code,
      );
    }
  }

  // Policy setting association checks
  if (
    createdPolicy.policySetting !== undefined &&
    createdPolicy.policySetting !== null
  ) {
    TestValidator.predicate(
      "fetched policy has a policySetting when created policy does",
      fetchedPolicy.policySetting !== null &&
        fetchedPolicy.policySetting !== undefined,
    );

    if (
      fetchedPolicy.policySetting !== null &&
      fetchedPolicy.policySetting !== undefined
    ) {
      TestValidator.equals(
        "policySetting.id matches created policy setting id",
        fetchedPolicy.policySetting.id,
        policySetting.id,
      );
      TestValidator.equals(
        "policySetting.code matches created policy setting code",
        fetchedPolicy.policySetting.code,
        policySetting.code,
      );
    }
  }

  // Timestamps: ensure created_at is not after fetched updated_at to respect read-only GET
  TestValidator.predicate(
    "fetched created_at is same or after created created_at",
    new Date(fetchedPolicy.created_at).getTime() >=
      new Date(createdPolicy.created_at).getTime(),
  );

  TestValidator.predicate(
    "fetched updated_at is same or after created updated_at",
    new Date(fetchedPolicy.updated_at).getTime() >=
      new Date(createdPolicy.updated_at).getTime(),
  );
}
