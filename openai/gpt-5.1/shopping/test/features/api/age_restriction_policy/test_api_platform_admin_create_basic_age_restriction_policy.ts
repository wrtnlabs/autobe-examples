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
 * Validate creation of a basic global age restriction policy by a platform
 * admin.
 *
 * Business goal:
 *
 * - Ensure that an authenticated platform administrator can create a simple age
 *   restriction policy with minimal required fields, representing a global
 *   policy (no region or policy setting binding), and that the response echoes
 *   critical fields correctly.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new platform administrator using POST
 *    /auth/platformAdmin/join. The SDK automatically stores the Authorization
 *    header on the provided connection.
 * 2. Using this authenticated connection, call POST
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies with a minimal
 *    IShoppingMallAgeRestrictionPolicy.ICreate payload:
 *
 *    - Code: unique business code for the policy
 *    - Name: human-friendly label
 *    - Require_verified_age: concrete boolean (e.g., true)
 *    - Active: true
 *    - Minimum_age_years: concrete age threshold (e.g., 19)
 *    - Region_setting_id: null (global policy)
 *    - Policy_setting_id: null (no shared policy profile)
 *    - Omit other optional fields for a minimal request
 * 3. Validate that the returned IShoppingMallAgeRestrictionPolicy reflects the
 *    request and basic lifecycle expectations.
 */
export async function test_api_platform_admin_create_basic_age_restriction_policy(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.e2e-shoppingmall.test/join",
    referrer: "https://admin.e2e-shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Sanity check: admin is active
  TestValidator.predicate(
    "platform admin should be active after join",
    admin.isActive,
  );

  // 2. Build minimal age restriction policy creation payload
  const requireVerifiedAge = true;
  const minimumAgeYearsRaw = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  const minimumAgeYears = minimumAgeYearsRaw < 0 ? 0 : minimumAgeYearsRaw; // ensure non-negative

  const policyCodeBase = "adult_only_basic_e2e_";
  const policyCodeSuffix = RandomGenerator.alphaNumeric(8);
  const policyCode = `${policyCodeBase}${policyCodeSuffix}`;

  const createBody = {
    code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    // description omitted for minimal payload
    minimum_age_years: minimumAgeYears,
    require_verified_age: requireVerifiedAge,
    // config_payload omitted for minimal payload
    active: true,
    // Effective period omitted for immediate and open-ended policy
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  // 3. Create the age restriction policy
  const created: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAgeRestrictionPolicy>(created);

  // 4. Business assertions on the created policy
  TestValidator.equals(
    "created policy code should match request payload",
    created.code,
    createBody.code,
  );

  TestValidator.equals(
    "created policy minimum_age_years should match request payload",
    created.minimum_age_years,
    createBody.minimum_age_years,
  );

  TestValidator.equals(
    "created policy require_verified_age should respect request payload",
    created.require_verified_age,
    createBody.require_verified_age,
  );

  TestValidator.equals(
    "created policy active flag should be true",
    created.active,
    true,
  );

  // regionSetting and policySetting should not be associated when *_id are null
  TestValidator.equals(
    "created policy should not have an associated regionSetting when region_setting_id is null",
    created.regionSetting,
    null,
  );

  TestValidator.equals(
    "created policy should not have an associated policySetting when policy_setting_id is null",
    created.policySetting,
    null,
  );

  // deleted_at must be null (policy is not soft-deleted on creation)
  TestValidator.equals(
    "created policy deleted_at should be null on creation",
    created.deleted_at ?? null,
    null,
  );

  // effective_from and effective_to are expected to be null or undefined when omitted
  TestValidator.equals(
    "created policy effective_from should be null when not provided",
    created.effective_from ?? null,
    null,
  );

  TestValidator.equals(
    "created policy effective_to should be null when not provided",
    created.effective_to ?? null,
    null,
  );

  // id, created_at, and updated_at existence already guaranteed by typia.assert,
  // but add a simple non-empty predicate for business clarity.
  TestValidator.predicate(
    "created policy should have a non-empty id",
    created.id.length > 0,
  );

  TestValidator.predicate(
    "created policy should have a created_at timestamp",
    created.created_at.length > 0,
  );

  TestValidator.predicate(
    "created policy should have an updated_at timestamp",
    created.updated_at.length > 0,
  );
}
