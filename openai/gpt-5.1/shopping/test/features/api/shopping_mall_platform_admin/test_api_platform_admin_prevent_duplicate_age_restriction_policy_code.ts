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

export async function test_api_platform_admin_prevent_duplicate_age_restriction_policy_code(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator so that subsequent calls run with platformAdmin privileges.
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial age restriction policy with a unique business code.
  const policyCode = `duplicate_code_test_e2e_${RandomGenerator.alphaNumeric(12)}`;

  const firstCreateBody = {
    code: policyCode,
    name: "E2E Duplicate Code Policy - Primary",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    minimum_age_years: 19,
    require_verified_age: true,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const firstPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<IShoppingMallAgeRestrictionPolicy>(firstPolicy);

  // Basic sanity checks on the created policy.
  TestValidator.equals(
    "created policy code should match request code",
    firstPolicy.code,
    policyCode,
  );
  TestValidator.predicate(
    "created policy should be active",
    firstPolicy.active === true,
  );

  // 3. Attempt to create a second policy with the same code but different attributes.
  const secondCreateBody = {
    code: policyCode, // same code -> should violate unique index
    name: "E2E Duplicate Code Policy - Secondary",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 21,
    require_verified_age: false,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  await TestValidator.error(
    "creating a second age restriction policy with the same business code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 4. Ensure the originally created policy remains consistent in memory.
  TestValidator.equals(
    "original policy still has the expected code after duplicate attempt",
    firstPolicy.code,
    policyCode,
  );
}
