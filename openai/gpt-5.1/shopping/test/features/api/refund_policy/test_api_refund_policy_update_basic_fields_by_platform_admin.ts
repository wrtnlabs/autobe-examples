import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate that a platform administrator can update basic fields of an existing
 * refund policy.
 *
 * Business workflow:
 *
 * 1. Join as a new platform admin to obtain an authorized context.
 * 2. Create a policy setting profile (category "refund") to be reused by the
 *    refund policy.
 * 3. Create a region setting to scope the policies.
 * 4. Optionally create a cancellation policy aligned with the same region and
 *    policy setting.
 * 5. Create an initial refund policy linked to the created policy setting and
 *    region.
 * 6. Update basic fields of that refund policy via PUT using its business code.
 * 7. Assert that mutable fields are updated while immutable identifiers and
 *    omitted effective period fields remain unchanged.
 */
export async function test_api_refund_policy_update_basic_fields_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth + token wiring via SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile for refund policies
  const policySettingCode = `refund_profile_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Refund Policy Profile",
    category: "refund",
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

  // 3. Create a region setting
  const regionCode = `US_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "United States",
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

  // 4. Optional: create a cancellation policy aligned with region and policy setting
  const cancellationPolicyBody = {
    code: `cancel_${RandomGenerator.alphaNumeric(8)}`,
    name: "Basic Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24 as number & tags.Type<"int32">,
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
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create an initial refund policy
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const initialRefundBody = {
    code: refundPolicyCode,
    name: "Initial Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: 100,
    configurationPayload: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const created: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: initialRefundBody },
    );
  typia.assert(created);

  // 6. Prepare update payload for basic fields
  const updatedName = "Updated Refund Policy Name";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedRefundWindowDays = 7 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const updatedMaxRefundRate = 0.8;
  const updatedIsActive = false;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    refundWindowDays: updatedRefundWindowDays,
    maxRefundRate: updatedMaxRefundRate,
    isActive: updatedIsActive,
  } satisfies IShoppingMallRefundPolicy.IUpdate;

  // 7. Execute the update call by refundPolicyCode
  const updated: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode: created.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 8. Validate identifiers and unchanged structural fields
  TestValidator.equals(
    "id should remain unchanged after refund policy update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "code should remain unchanged after refund policy update",
    updated.code,
    created.code,
  );

  // 9. Validate updated basic fields
  TestValidator.equals(
    "name should be updated on refund policy",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "description should be updated on refund policy",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "isActive should match updated flag on refund policy",
    updated.isActive,
    updatedIsActive,
  );
  TestValidator.equals(
    "maxRefundRate should be updated on refund policy",
    updated.maxRefundRate,
    updatedMaxRefundRate,
  );

  // refundWindowDays is not directly exposed as such on IShoppingMallRefundPolicy,
  // but the DTO description says it maps to a day-window-related field. Since
  // the structure exposes maxDaysAfterDelivery instead, compare that if set.
  if (
    created.maxDaysAfterDelivery !== undefined &&
    updated.maxDaysAfterDelivery !== undefined
  ) {
    TestValidator.notEquals(
      "maxDaysAfterDelivery should change when refundWindowDays changes",
      updated.maxDaysAfterDelivery,
      created.maxDaysAfterDelivery,
    );
  }

  // 10. Verify effectiveFrom/effectiveUntil unchanged (nullable, may be undefined)
  TestValidator.equals(
    "effectiveFrom should remain unchanged when not updated",
    updated.effectiveFrom ?? null,
    created.effectiveFrom ?? null,
  );
  TestValidator.equals(
    "effectiveUntil should remain unchanged when not updated",
    updated.effectiveUntil ?? null,
    created.effectiveUntil ?? null,
  );

  // 11. Verify regionCode and policySettingCode unchanged
  TestValidator.equals(
    "regionCode should remain unchanged after refund policy update",
    updated.regionCode ?? null,
    created.regionCode ?? null,
  );
  TestValidator.equals(
    "policySettingCode should remain unchanged after refund policy update",
    updated.policySettingCode ?? null,
    created.policySettingCode ?? null,
  );

  // 12. Additional notEquals checks for fields that should differ
  TestValidator.notEquals(
    "name should differ from original after update",
    updated.name,
    created.name,
  );
  TestValidator.notEquals(
    "description should differ from original after update",
    updated.description,
    created.description,
  );
  TestValidator.notEquals(
    "maxRefundRate should differ from original after update",
    updated.maxRefundRate,
    created.maxRefundRate,
  );
  TestValidator.notEquals(
    "isActive should differ from original after update",
    updated.isActive,
    created.isActive,
  );
}
