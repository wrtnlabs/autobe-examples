import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_cancellation_policy_delete_for_policy_with_region_and_profile_links(
  connection: api.IConnection,
) {
  /**
   * Validate deletion of a cancellation policy that is linked to both a region
   * setting and a policy setting profile.
   *
   * Business context:
   *
   * - Cancellation policies reference region configurations and high-level policy
   *   setting profiles via business codes.
   * - Platform admins must be able to delete a cancellation policy record without
   *   accidentally deleting or invalidating the referenced region and policy
   *   setting, so that those configurations remain reusable.
   *
   * Workflow covered by this test:
   *
   * 1. Join as a platform admin (creates an authorized admin session).
   * 2. Create a policy setting profile with a unique business code.
   * 3. Create an active region setting with its own unique code.
   * 4. Create a cancellation policy that links to the region and policy setting
   *    via region_code and policy_setting_code.
   * 5. Delete the cancellation policy by its business code.
   * 6. Create a second cancellation policy that reuses the same region_code and
   *    policy_setting_code to prove that those referenced rows still exist and
   *    remain usable after the first policy has been deleted.
   */

  // -------------------------------------------------------------
  // 1. Bootstrap platform admin session via join
  // -------------------------------------------------------------
  const adminJoinRequest = {
    email: `${RandomGenerator.alphaNumeric(12)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "platform admin session is active",
    () => admin.isActive === true,
  );

  // -------------------------------------------------------------
  // 2. Create policy setting profile (category: cancellation)
  // -------------------------------------------------------------
  const policySettingCode = `cancellation_profile_${RandomGenerator.alphaNumeric(8)}`;

  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Default Cancellation Profile",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  TestValidator.equals(
    "created policy setting code must match request code",
    policySetting.code,
    policySettingCode,
  );
  TestValidator.equals(
    "created policy setting category must be 'cancellation'",
    policySetting.category,
    "cancellation",
  );

  // -------------------------------------------------------------
  // 3. Create region configuration
  // -------------------------------------------------------------
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const regionCreateBody = {
    code: regionCode,
    name: `Region ${RandomGenerator.name(1)}`,
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  TestValidator.equals(
    "created region setting code must match request code",
    region.code,
    regionCode,
  );
  TestValidator.predicate(
    "created region setting must be active",
    () => region.active === true,
  );

  // -------------------------------------------------------------
  // 4. Create first cancellation policy linked to region + policy setting
  // -------------------------------------------------------------
  const cancellationPolicyCode1 = `CANCEL_${RandomGenerator.alphaNumeric(10)}`;

  const cancellationPolicyCreateBody1 = {
    code: cancellationPolicyCode1,
    name: "Linked Cancellation Policy #1",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const policy1: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreateBody1 },
    );
  typia.assert(policy1);

  TestValidator.equals(
    "created cancellation policy code must match request code",
    policy1.code,
    cancellationPolicyCode1,
  );

  if (policy1.region_setting !== undefined && policy1.region_setting !== null) {
    TestValidator.equals(
      "linked region_setting.code must match regionCode",
      policy1.region_setting.code,
      regionCode,
    );
  }

  if (policy1.policy_setting !== undefined && policy1.policy_setting !== null) {
    TestValidator.equals(
      "linked policy_setting.code must match policySettingCode",
      policy1.policy_setting.code,
      policySettingCode,
    );
  }

  // -------------------------------------------------------------
  // 5. Delete the first cancellation policy by its business code
  // -------------------------------------------------------------
  await api.functional.shoppingMall.platformAdmin.cancellationPolicies.erase(
    connection,
    { cancellationPolicyCode: cancellationPolicyCode1 },
  );

  // If erase had failed due to constraints or missing policy, an exception
  // would have been thrown above. Reaching this point indicates successful
  // completion from the SDK perspective.

  // -------------------------------------------------------------
  // 6. Reuse region_code and policy_setting_code in a second policy
  //    to prove that region/policy setting remain intact and usable.
  // -------------------------------------------------------------
  const cancellationPolicyCode2 = `CANCEL_${RandomGenerator.alphaNumeric(10)}`;

  const cancellationPolicyCreateBody2 = {
    code: cancellationPolicyCode2,
    name: "Linked Cancellation Policy #2 (post-delete)",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: false,
    allow_partial_cancellation: true,
    max_hours_after_payment: null,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const policy2: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreateBody2 },
    );
  typia.assert(policy2);

  TestValidator.equals(
    "second cancellation policy code must match its request code",
    policy2.code,
    cancellationPolicyCode2,
  );

  if (policy2.region_setting !== undefined && policy2.region_setting !== null) {
    TestValidator.equals(
      "second policy's region_setting.code must reuse regionCode",
      policy2.region_setting.code,
      regionCode,
    );
  }

  if (policy2.policy_setting !== undefined && policy2.policy_setting !== null) {
    TestValidator.equals(
      "second policy's policy_setting.code must reuse policySettingCode",
      policy2.policy_setting.code,
      policySettingCode,
    );
  }

  // Final business assertion: ability to create policy2 after deleting policy1
  // demonstrates that deleting a cancellation policy does not delete or
  // invalidate the underlying region or policy setting configurations.
  TestValidator.predicate(
    "reuse of region_code and policy_setting_code after deletion must succeed",
    () => policy2.active === true,
  );
}
