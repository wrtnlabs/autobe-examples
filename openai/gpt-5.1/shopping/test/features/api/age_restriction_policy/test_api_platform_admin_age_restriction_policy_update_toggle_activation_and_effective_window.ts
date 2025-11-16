import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate toggling activation and effective window for age restriction
 * policies.
 *
 * This E2E scenario ensures a platform administrator can create and then update
 * an age restriction policy using the business code-based PUT endpoint, with
 * proper handling of activation flags and effective period fields.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a new platform admin via POST
 *    /auth/platformAdmin/join.
 * 2. Create a region configuration entry via POST
 *    /shoppingMall/platformAdmin/regionSettings.
 * 3. Create a generic policy setting profile in the "age_restriction" category via
 *    POST /shoppingMall/platformAdmin/policySettings.
 * 4. Create an age restriction policy via POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies that references the
 *    region and policy setting, is initially active, and has an open-ended
 *    effective window.
 * 5. Update the age restriction policy via PUT
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies/{code} to toggle its
 *    active flag and change its effective_from/effective_to and
 *    minimum_age_years.
 * 6. Verify that the update response preserves identity fields (id, code,
 *    created_at), advances updated_at, and reflects the new business fields.
 * 7. Optionally perform a second update to toggle the policy back on and adjust
 *    its effective window again, confirming repeated updates behave
 *    consistently.
 */
export async function test_api_platform_admin_age_restriction_policy_update_toggle_activation_and_effective_window(
  connection: api.IConnection,
) {
  // 1. Join a platform admin and establish authenticated context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a baseline region configuration that policies can reference.
  const regionCode = `REG-${RandomGenerator.alphaNumeric(8)}`;
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

  // 3. Create a policy setting profile in age_restriction category.
  const policySettingCode = `AGE_PROFILE_${RandomGenerator.alphaNumeric(6)}`;
  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Default Age Restriction Profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ strict: false }),
    active: true,
    effective_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 4. Create an age restriction policy referencing region and policy setting.
  const agePolicyCode = `AGE_POLICY_${RandomGenerator.alphaNumeric(6)}`;
  const initialEffectiveFrom = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const ageRestrictionCreateBody = {
    code: agePolicyCode,
    name: "Adult Only Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    minimum_age_years: 18 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: JSON.stringify({
      regionScoped: true,
      notes: "Initial config",
    }),
    active: true,
    effective_from: initialEffectiveFrom,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const createdPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionCreateBody },
    );
  typia.assert(createdPolicy);

  // Capture original timestamps and identity fields.
  const originalId = createdPolicy.id;
  const originalCode = createdPolicy.code;
  const originalCreatedAt = createdPolicy.created_at;
  const originalUpdatedAt = createdPolicy.updated_at;

  TestValidator.equals(
    "created policy id should match itself and not be empty",
    createdPolicy.id,
    originalId,
  );
  TestValidator.equals(
    "created policy code should match input code",
    createdPolicy.code,
    agePolicyCode,
  );
  TestValidator.equals(
    "created policy active should be true",
    createdPolicy.active,
    true,
  );
  TestValidator.equals(
    "created policy minimum_age_years should be initial value",
    createdPolicy.minimum_age_years,
    ageRestrictionCreateBody.minimum_age_years,
  );

  // 5. First update: toggle active to false and tighten effective window.
  const firstUpdateEffectiveFrom = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const firstUpdateEffectiveTo = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const stricterAge = 21 as number & tags.Type<"int32">;

  const firstUpdateBody = {
    active: false,
    minimum_age_years: stricterAge,
    effective_from: firstUpdateEffectiveFrom,
    effective_to: firstUpdateEffectiveTo,
  } satisfies IShoppingMallAgeRestrictionPolicy.IUpdate;

  const updatedPolicy1: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.update(
      connection,
      {
        ageRestrictionPolicyCode: originalCode,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedPolicy1);

  // Validate invariants and updated fields after first update.
  TestValidator.equals(
    "policy id should remain stable after first update",
    updatedPolicy1.id,
    originalId,
  );
  TestValidator.equals(
    "policy code should remain stable after first update",
    updatedPolicy1.code,
    originalCode,
  );
  TestValidator.equals(
    "policy active should be false after toggling off",
    updatedPolicy1.active,
    false,
  );
  TestValidator.equals(
    "policy minimum_age_years should reflect stricter value",
    updatedPolicy1.minimum_age_years,
    stricterAge,
  );
  TestValidator.equals(
    "policy effective_from should match first update value",
    updatedPolicy1.effective_from,
    firstUpdateEffectiveFrom,
  );
  TestValidator.equals(
    "policy effective_to should match first update value",
    updatedPolicy1.effective_to,
    firstUpdateEffectiveTo,
  );
  TestValidator.equals(
    "policy created_at should remain unchanged after first update",
    updatedPolicy1.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "policy updated_at should advance after first update",
    updatedPolicy1.updated_at,
    originalUpdatedAt,
  );

  if (updatedPolicy1.regionSetting && createdPolicy.regionSetting) {
    TestValidator.equals(
      "regionSetting id should remain same across update",
      updatedPolicy1.regionSetting.id,
      createdPolicy.regionSetting.id,
    );
    TestValidator.equals(
      "regionSetting code should remain same across update",
      updatedPolicy1.regionSetting.code,
      createdPolicy.regionSetting.code,
    );
  }

  if (updatedPolicy1.policySetting && createdPolicy.policySetting) {
    TestValidator.equals(
      "policySetting id should remain same across update",
      updatedPolicy1.policySetting.id,
      createdPolicy.policySetting.id,
    );
    TestValidator.equals(
      "policySetting code should remain same across update",
      updatedPolicy1.policySetting.code,
      createdPolicy.policySetting.code,
    );
  }

  // 6. Second update (optional): toggle active back to true and reopen window.
  const secondUpdateEffectiveFrom = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const moreLenientAge = 18 as number & tags.Type<"int32">;

  const secondUpdateBody = {
    active: true,
    minimum_age_years: moreLenientAge,
    effective_from: secondUpdateEffectiveFrom,
    effective_to: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.IUpdate;

  const updatedPolicy2: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.update(
      connection,
      {
        ageRestrictionPolicyCode: originalCode,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedPolicy2);

  TestValidator.equals(
    "policy id should remain stable after second update",
    updatedPolicy2.id,
    originalId,
  );
  TestValidator.equals(
    "policy code should remain stable after second update",
    updatedPolicy2.code,
    originalCode,
  );
  TestValidator.equals(
    "policy should be active again after second update",
    updatedPolicy2.active,
    true,
  );
  TestValidator.equals(
    "policy minimum_age_years should match more lenient value",
    updatedPolicy2.minimum_age_years,
    moreLenientAge,
  );
  TestValidator.equals(
    "policy effective_from should match second update value",
    updatedPolicy2.effective_from,
    secondUpdateEffectiveFrom,
  );
  TestValidator.equals(
    "policy effective_to should be null after reopening window",
    updatedPolicy2.effective_to,
    null,
  );
  TestValidator.equals(
    "policy created_at should remain original after second update",
    updatedPolicy2.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "policy updated_at should advance again after second update",
    updatedPolicy2.updated_at,
    updatedPolicy1.updated_at,
  );
}
