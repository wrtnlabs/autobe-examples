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

export async function test_api_platform_admin_create_age_restriction_policy_with_region_and_policy_setting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
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
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a policy setting profile in age_restriction category
  const policyCode = `age_restriction_default_profile_${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policyCreateBody = {
    code: policyCode,
    name: "Age Restriction Default Profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({ level: "teen_restricted" }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 3. Create a region setting
  const regionCode = `KR_${RandomGenerator.alphaNumeric(4)}`;
  const regionCreateBody = {
    code: regionCode,
    name: "Korea",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert<IShoppingMallRegionSetting>(regionSetting);

  // 4. Create an age restriction policy linked to the region and policy setting
  const agePolicyCode = `teen_restricted_with_region_e2e_${RandomGenerator.alphaNumeric(6)}`;
  const policyEffectiveFrom = new Date().toISOString();
  const policyEffectiveTo = new Date(
    new Date(policyEffectiveFrom).getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const agePolicyCreateBody = {
    code: agePolicyCode,
    name: "Teen Restricted With Region (E2E)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    minimum_age_years: 15,
    require_verified_age: true,
    config_payload: JSON.stringify({
      allowed_regions: [regionCode],
      min_age: 15,
    }),
    active: true,
    effective_from: policyEffectiveFrom,
    effective_to: policyEffectiveTo,
    region_setting_id: regionSetting.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyCreateBody },
    );
  typia.assert<IShoppingMallAgeRestrictionPolicy>(agePolicy);

  // 5. Validate associations and core fields
  // Validate minimum_age_years, require_verified_age, active, and effective period
  TestValidator.equals(
    "minimum_age_years must match request",
    agePolicy.minimum_age_years,
    agePolicyCreateBody.minimum_age_years,
  );
  TestValidator.equals(
    "require_verified_age must match request",
    agePolicy.require_verified_age,
    agePolicyCreateBody.require_verified_age,
  );
  TestValidator.equals(
    "active flag must match request",
    agePolicy.active,
    agePolicyCreateBody.active,
  );
  TestValidator.equals(
    "effective_from must match request",
    agePolicy.effective_from ?? null,
    agePolicyCreateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "effective_to must match request",
    agePolicy.effective_to ?? null,
    agePolicyCreateBody.effective_to ?? null,
  );

  // Validate regionSetting summary linkage
  TestValidator.predicate(
    "regionSetting summary must be present on created age policy",
    agePolicy.regionSetting !== null && agePolicy.regionSetting !== undefined,
  );
  if (
    agePolicy.regionSetting !== null &&
    agePolicy.regionSetting !== undefined
  ) {
    TestValidator.equals(
      "age policy regionSetting.id must equal created region id",
      agePolicy.regionSetting.id,
      regionSetting.id,
    );
    TestValidator.equals(
      "age policy regionSetting.code must equal created region code",
      agePolicy.regionSetting.code,
      regionSetting.code,
    );
    TestValidator.equals(
      "age policy regionSetting.name must equal created region name",
      agePolicy.regionSetting.name,
      regionSetting.name,
    );
  }

  // Validate policySetting summary linkage
  TestValidator.predicate(
    "policySetting summary must be present on created age policy",
    agePolicy.policySetting !== null && agePolicy.policySetting !== undefined,
  );
  if (
    agePolicy.policySetting !== null &&
    agePolicy.policySetting !== undefined
  ) {
    TestValidator.equals(
      "age policy policySetting.id must equal created policySetting id",
      agePolicy.policySetting.id,
      policySetting.id,
    );
    TestValidator.equals(
      "age policy policySetting.code must equal created policySetting code",
      agePolicy.policySetting.code,
      policySetting.code,
    );
    TestValidator.equals(
      "age policy policySetting.name must equal created policySetting name",
      agePolicy.policySetting.name,
      policySetting.name,
    );
  }
}
