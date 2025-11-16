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
 * Validate that a platform admin can successfully delete an existing age
 * restriction policy.
 *
 * Business flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join (auth token
 *    attached to connection).
 * 2. Create a region setting that can be associated with policies.
 * 3. Create a policy setting profile.
 * 4. Seed a cancellation policy using the region and policy setting codes (for
 *    realistic environment).
 * 5. Create a refund policy that references the policy setting (by
 *    policySettingCode) and region (by regionCode).
 * 6. Create an age restriction policy with a unique business code, linking it to
 *    the region and policy setting IDs.
 * 7. Call DELETE
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies/{ageRestrictionPolicyCode}
 *    with that code.
 * 8. Assert that the deletion call completes without error (void response).
 */
export async function test_api_platform_admin_age_restriction_policy_delete_success(
  connection: api.IConnection,
) {
  // 1. Platform admin join (also sets Authorization header internally)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
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
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create region setting
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
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

  // 3. Create policy setting profile
  const policySettingCode = `POLICY_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Age Restriction Base Profile",
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

  // 4. Seed a cancellation policy (for realism)
  const cancellationPolicyCode = `CANCEL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationPolicyCode,
    name: "Test Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48 as number & tags.Type<"int32">,
    config_payload: null,
    effective_from: null,
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

  // 5. Create a refund policy referencing region and policy setting
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundBody = {
    code: refundPolicyCode,
    name: "Test Refund Policy",
    description: "Refund policy used in age restriction delete scenario",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 6. Create an age restriction policy linked to region & policy setting IDs
  const agePolicyCode = `AGE_${RandomGenerator.alphaNumeric(8)}`;
  const ageRestrictionBody = {
    code: agePolicyCode,
    name: "Adult Only Age Policy",
    description: "Policy requiring minimum age 19 with verified age.",
    minimum_age_years: 19 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionBody },
    );
  typia.assert(agePolicy);
  TestValidator.equals(
    "created age policy code should match request code",
    agePolicy.code,
    agePolicyCode,
  );

  // 7. Delete the age restriction policy by its business code
  await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.erase(
    connection,
    { ageRestrictionPolicyCode: agePolicyCode },
  );

  // 8. If we reach here without an exception, deletion is considered successful
  TestValidator.predicate(
    "age restriction policy deletion call should complete without error",
    true,
  );
}
