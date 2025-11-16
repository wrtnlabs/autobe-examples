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
 * Validate that a platform admin can detach region and policy setting
 * associations from an age restriction policy while keeping core rule fields
 * intact.
 *
 * Business context: Platform admins define age restriction policies that may be
 * scoped to a specific region (via regionSetting) and/or tied to a shared
 * policy setting profile (policySetting). In some cases, an existing policy
 * should be converted into a global policy by clearing those associations while
 * preserving its minimum age and verification rules.
 *
 * Test steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to generate a
 *         valid join payload.
 *    - The join call will set the Authorization header internally; do not manipulate
 *         headers directly.
 * 2. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings.
 *
 *    - Build an IShoppingMallRegionSetting.ICreate body with realistic values (code,
 *         name, active=true, optional metadata can be null).
 *    - Assert the response with typia.assert and ensure basic invariants (e.g.,
 *         active is true).
 * 3. Create a policy setting via POST /shoppingMall/platformAdmin/policySettings.
 *
 *    - Build an IShoppingMallPolicySetting.ICreate body with a unique code, a name,
 *         category such as "age_restriction", and active true;
 *         description/config_payload may be simple strings or null.
 *    - Assert the response and check that code and category match.
 * 4. Create an age restriction policy via POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies.
 *
 *    - Use a body satisfying IShoppingMallAgeRestrictionPolicy.ICreate with fields:
 *
 *         - Code: a unique string
 *         - Name: descriptive name
 *         - Minimum_age_years: an int32 value like 19
 *         - Require_verified_age: boolean, e.g. true
 *         - Active: true
 *         - Optional effective_from/effective_to: you may omit or set to null
 *         - Region_setting_id: region.id
 *         - Policy_setting_id: policy.id
 *    - Assert the response and then:
 *
 *         - Use TestValidator.equals to verify that output.regionSetting is not null and
 *                   its id/code match the created region’s id/code.
 *         - Use TestValidator.equals similarly for policySetting against the created
 *                   policy setting summary.
 * 5. Update the age restriction policy via PUT
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies/{code}.
 *
 *    - Capture the original updated_at, minimum_age_years, and require_verified_age
 *         from the created policy.
 *    - Call update with props:
 *
 *         - AgeRestrictionPolicyCode: createdPolicy.code
 *         - Body satisfies IShoppingMallAgeRestrictionPolicy.IUpdate with:
 *
 *                           - Region_setting_id: null
 *                           - Policy_setting_id: null
 *                           - (optionally) name unchanged or slightly tweaked, but keep minimum_age_years
 *                                               and require_verified_age equal to the
 *                                               original values.
 *    - Assert the update response with typia.assert.
 * 6. Validate the updated policy’s semantics:
 *
 *    - TestValidator.equals("policy id preserved", updated.id, created.id)
 *    - TestValidator.equals("policy code preserved", updated.code, created.code)
 *    - TestValidator.equals("minimum_age_years unchanged",
 *         updated.minimum_age_years, created.minimum_age_years)
 *    - TestValidator.equals("require_verified_age unchanged",
 *         updated.require_verified_age, created.require_verified_age)
 *    - TestValidator.equals("regionSetting cleared", updated.regionSetting, null)
 *    - TestValidator.equals("policySetting cleared", updated.policySetting, null)
 *    - TestValidator.notEquals("updated_at changed", updated.updated_at,
 *         created.updated_at)
 *
 * Notes and constraints:
 *
 * - Do not attempt to read or write connection.headers; rely on the join call to
 *   manage Authorization.
 * - Do not test specific HTTP status codes; focus on successful flow and
 *   business-level invariants.
 * - Use typia.assert on every non-void API response for structural validation.
 */
export async function test_api_platform_admin_age_restriction_policy_update_detach_region_and_profile(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain authorized session
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region setting
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);
  TestValidator.equals("region setting should be active", region.active, true);

  // 3. Create a policy setting profile
  const policyCode = `age_policy_${RandomGenerator.alphaNumeric(6)}`;
  const policyCreateBody = {
    code: policyCode,
    name: "Age Restriction Base Profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;
  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "policy setting code matches",
    policySetting.code,
    policyCode,
  );
  TestValidator.equals(
    "policy setting category is age_restriction",
    policySetting.category,
    "age_restriction",
  );

  // 4. Create an age restriction policy associated with region and policy setting
  const agePolicyCode = `age_restrict_${RandomGenerator.alphaNumeric(6)}`;
  const minimumAge: number & tags.Type<"int32"> = 19 as number &
    tags.Type<"int32">;
  const agePolicyCreateBody = {
    code: agePolicyCode,
    name: "Adult Only Policy",
    description: "Policy requiring users to be at least 19 years old.",
    minimum_age_years: minimumAge,
    require_verified_age: true,
    config_payload: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;
  const createdPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyCreateBody },
    );
  typia.assert(createdPolicy);

  // Validate associations exist on creation
  TestValidator.predicate(
    "created policy should have regionSetting summary",
    createdPolicy.regionSetting !== null &&
      createdPolicy.regionSetting !== undefined,
  );
  if (
    createdPolicy.regionSetting !== null &&
    createdPolicy.regionSetting !== undefined
  ) {
    TestValidator.equals(
      "regionSetting id matches region.id",
      createdPolicy.regionSetting.id,
      region.id,
    );
    TestValidator.equals(
      "regionSetting code matches region.code",
      createdPolicy.regionSetting.code,
      region.code,
    );
  }

  TestValidator.predicate(
    "created policy should have policySetting summary",
    createdPolicy.policySetting !== null &&
      createdPolicy.policySetting !== undefined,
  );
  if (
    createdPolicy.policySetting !== null &&
    createdPolicy.policySetting !== undefined
  ) {
    TestValidator.equals(
      "policySetting id matches policySetting.id",
      createdPolicy.policySetting.id,
      policySetting.id,
    );
    TestValidator.equals(
      "policySetting code matches policySetting.code",
      createdPolicy.policySetting.code,
      policySetting.code,
    );
  }

  // Capture core fields before update
  const originalId = createdPolicy.id;
  const originalCode = createdPolicy.code;
  const originalMinimumAge = createdPolicy.minimum_age_years;
  const originalRequireVerifiedAge = createdPolicy.require_verified_age;
  const originalUpdatedAt = createdPolicy.updated_at;

  // 5. Update the age restriction policy to detach region and policy setting
  const updateBody = {
    // Optionally tweak name to ensure an actual update
    name: `${createdPolicy.name} (detached)`,
    minimum_age_years: originalMinimumAge,
    require_verified_age: originalRequireVerifiedAge,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.IUpdate;

  const updatedPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.update(
      connection,
      {
        ageRestrictionPolicyCode: createdPolicy.code,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 6. Validate updated policy semantics
  TestValidator.equals(
    "policy id preserved after detach",
    updatedPolicy.id,
    originalId,
  );
  TestValidator.equals(
    "policy code preserved after detach",
    updatedPolicy.code,
    originalCode,
  );
  TestValidator.equals(
    "minimum_age_years unchanged after detach",
    updatedPolicy.minimum_age_years,
    originalMinimumAge,
  );
  TestValidator.equals(
    "require_verified_age unchanged after detach",
    updatedPolicy.require_verified_age,
    originalRequireVerifiedAge,
  );
  TestValidator.equals(
    "regionSetting cleared to null",
    updatedPolicy.regionSetting,
    null,
  );
  TestValidator.equals(
    "policySetting cleared to null",
    updatedPolicy.policySetting,
    null,
  );
  TestValidator.notEquals(
    "updated_at should change after detach update",
    updatedPolicy.updated_at,
    originalUpdatedAt,
  );
}
