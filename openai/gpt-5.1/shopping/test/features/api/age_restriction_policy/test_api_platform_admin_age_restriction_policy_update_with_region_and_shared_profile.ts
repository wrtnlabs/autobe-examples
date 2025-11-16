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

export async function test_api_platform_admin_age_restriction_policy_update_with_region_and_shared_profile(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create policy setting profile for age restriction
  const policySettingCode = `age_prof_${RandomGenerator.alphaNumeric(8)}`;
  const effectiveFromPolicy = new Date().toISOString();
  const effectiveToPolicy = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Age Restriction Shared Profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ minAgeDefault: 18 }),
    active: true,
    effective_from: effectiveFromPolicy,
    effective_to: effectiveToPolicy,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 3. Create a cancellation policy (context only)
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationPolicyCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24 as number & tags.Type<"int32">,
    config_payload: JSON.stringify({ windowHours: 24 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy referencing the policy setting profile
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundPolicyCode,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: JSON.stringify({ windowDays: 30 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(refundPolicy);

  // 5. Create region setting
  const regionCode = `EU_${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const regionCreateBody = {
    code: regionCode,
    name: "European Union Test Region",
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 6. Create baseline age restriction policy without region/profile association
  const agePolicyCode = `age_${RandomGenerator.alphaNumeric(8)}`;
  const ageCreateBody = {
    code: agePolicyCode,
    name: "Baseline Teen Restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 16 as number & tags.Type<"int32">,
    require_verified_age: false,
    config_payload: JSON.stringify({ baseMinAge: 16 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const createdAgePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageCreateBody },
    );
  typia.assert(createdAgePolicy);

  const originalId = createdAgePolicy.id;
  const originalCode = createdAgePolicy.code;
  const originalUpdatedAt = createdAgePolicy.updated_at;

  // 7. Prepare update body to attach region and shared policy setting profile
  const newName = "Updated Adult-Only Restriction";
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newMinAge = 18 as number & tags.Type<"int32">;
  const newRequireVerifiedAge = true;
  const newEffectiveFrom = new Date().toISOString();
  const newEffectiveTo = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    name: newName,
    description: newDescription,
    minimum_age_years: newMinAge,
    require_verified_age: newRequireVerifiedAge,
    config_payload: JSON.stringify({ baseMinAge: 18, strict: true }),
    active: true,
    effective_from: newEffectiveFrom,
    effective_to: newEffectiveTo,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.IUpdate;

  // 8. Execute update
  const updatedAgePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.update(
      connection,
      {
        ageRestrictionPolicyCode: agePolicyCode,
        body: updateBody,
      },
    );
  typia.assert(updatedAgePolicy);

  // 9. Assertions on identifiers stability
  TestValidator.equals(
    "age restriction policy id must remain stable after update",
    updatedAgePolicy.id,
    originalId,
  );
  TestValidator.equals(
    "age restriction policy code must remain stable after update",
    updatedAgePolicy.code,
    originalCode,
  );

  // 10. Assertions on updated scalar fields
  TestValidator.equals(
    "updated name must match update payload",
    updatedAgePolicy.name,
    newName,
  );
  TestValidator.equals(
    "updated description must match update payload",
    updatedAgePolicy.description ?? null,
    newDescription,
  );
  TestValidator.equals(
    "updated minimum_age_years must match update payload",
    updatedAgePolicy.minimum_age_years,
    newMinAge,
  );
  TestValidator.equals(
    "updated require_verified_age must match update payload",
    updatedAgePolicy.require_verified_age,
    newRequireVerifiedAge,
  );
  TestValidator.equals(
    "updated active flag must match update payload",
    updatedAgePolicy.active,
    true,
  );
  TestValidator.equals(
    "updated effective_from must match update payload",
    updatedAgePolicy.effective_from ?? null,
    newEffectiveFrom,
  );
  TestValidator.equals(
    "updated effective_to must match update payload",
    updatedAgePolicy.effective_to ?? null,
    newEffectiveTo,
  );

  // 11. Assertions on region and policy setting associations
  TestValidator.predicate(
    "regionSetting must be defined after update",
    updatedAgePolicy.regionSetting !== null &&
      updatedAgePolicy.regionSetting !== undefined,
  );
  if (updatedAgePolicy.regionSetting) {
    TestValidator.equals(
      "regionSetting.id must match created region id",
      updatedAgePolicy.regionSetting.id,
      region.id,
    );
    TestValidator.equals(
      "regionSetting.code must match created region code",
      updatedAgePolicy.regionSetting.code,
      region.code,
    );
  }

  TestValidator.predicate(
    "policySetting must be defined after update",
    updatedAgePolicy.policySetting !== null &&
      updatedAgePolicy.policySetting !== undefined,
  );
  if (updatedAgePolicy.policySetting) {
    TestValidator.equals(
      "policySetting.id must match created policy setting id",
      updatedAgePolicy.policySetting.id,
      policySetting.id,
    );
    TestValidator.equals(
      "policySetting.code must match created policy setting code",
      updatedAgePolicy.policySetting.code,
      policySetting.code,
    );
  }

  // 12. Ensure updated_at has changed
  TestValidator.notEquals(
    "updated_at must change after update",
    updatedAgePolicy.updated_at,
    originalUpdatedAt,
  );
}
