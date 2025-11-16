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
 * Validate that partial updates on refund policies only modify specified fields
 * and do not overwrite others.
 *
 * Business context: Platform administrators configure refund behavior through
 * refund policies. When updating these policies, they often want to change a
 * small subset of fields (e.g., description or configuration payload) without
 * accidentally resetting control flags or numeric limits. The PUT
 * /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode} endpoint uses
 * IShoppingMallRefundPolicy.IUpdate where all fields are optional, so the
 * backend must treat omitted properties as "keep existing value" rather than
 * resetting them to defaults or null.
 *
 * Steps:
 *
 * 1. Join a platform admin to obtain an authenticated admin session.
 * 2. Create a region setting to supply a regionCode for the refund policy.
 * 3. Create a policy setting profile to supply a policySettingCode for the refund
 *    policy.
 * 4. Create a cancellation policy (for realistic environment; not strictly
 *    asserted in relation to refund policy).
 * 5. Create a refund policy with non-trivial values for all configurable fields.
 * 6. Perform a partial update that changes only description and
 *    configurationPayload.
 * 7. Assert that updated description/configurationPayload are reflected while all
 *    other important fields remain unchanged.
 */
export async function test_api_refund_policy_update_partial_fields_without_overwriting_others(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://landing.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create region setting
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert<IShoppingMallRegionSetting>(region);

  // 3. Create policy setting profile
  const policyCode = `POLICY_${RandomGenerator.alphaNumeric(6)}`;
  const policyBody = {
    code: policyCode,
    name: "Refund Policy Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ tier: "gold", maxRequestsPerMonth: 10 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyBody },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 4. Create a cancellation policy (context only)
  const cancellationCode = `CANCEL_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: "Test Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ reasonRequired: true }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);

  // 5. Create initial refund policy with rich configuration
  const refundCode = `REFUND_${RandomGenerator.alphaNumeric(6)}`;
  const refundCreateBody = {
    code: refundCode,
    name: "Original Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 0.8,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      mode: "strict",
      escalation: "tier2",
    }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const original =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert<IShoppingMallRefundPolicy>(original);

  // 6. Prepare partial update payload (only description & configurationPayload)
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedConfigPayload = JSON.stringify({
    mode: "lenient",
    escalation: "tier1",
  });

  const updateBody = {
    description: updatedDescription,
    configurationPayload: updatedConfigPayload,
  } satisfies IShoppingMallRefundPolicy.IUpdate;

  // 7. Perform partial update
  const updated =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode: original.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(updated);

  // 8. Assert updated fields changed as requested
  TestValidator.equals(
    "refund policy description should be updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "refund policy configurationPayload should be updated",
    updated.configurationPayload,
    updatedConfigPayload,
  );

  // 9. Assert omitted fields remain unchanged
  TestValidator.equals(
    "allowFullRefund should remain unchanged",
    updated.allowFullRefund,
    original.allowFullRefund,
  );
  TestValidator.equals(
    "allowPartialRefund should remain unchanged",
    updated.allowPartialRefund,
    original.allowPartialRefund,
  );
  TestValidator.equals(
    "maxDaysAfterDelivery/refundWindowDays should remain consistent",
    updated.maxDaysAfterDelivery,
    original.maxDaysAfterDelivery,
  );
  TestValidator.equals(
    "maxRefundRate should remain unchanged",
    updated.maxRefundRate,
    original.maxRefundRate,
  );
  TestValidator.equals(
    "requireAdminApprovalOverAmount should remain unchanged",
    updated.requireAdminApprovalOverAmount,
    original.requireAdminApprovalOverAmount,
  );
  TestValidator.equals(
    "isActive should remain unchanged",
    updated.isActive,
    original.isActive,
  );
  TestValidator.equals(
    "effectiveFrom should remain unchanged",
    updated.effectiveFrom,
    original.effectiveFrom,
  );
  TestValidator.equals(
    "effectiveUntil should remain unchanged",
    updated.effectiveUntil,
    original.effectiveUntil,
  );
  TestValidator.equals(
    "regionCode should remain unchanged",
    updated.regionCode,
    original.regionCode,
  );
  TestValidator.equals(
    "policySettingCode should remain unchanged",
    updated.policySettingCode,
    original.policySettingCode,
  );

  // 10. Identity and audit fields consistency
  TestValidator.equals(
    "refund policy id should remain the same",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "refund policy code should remain the same",
    updated.code,
    original.code,
  );
  TestValidator.equals(
    "createdAt should remain unchanged",
    updated.createdAt,
    original.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain unchanged",
    updated.deletedAt,
    original.deletedAt,
  );
  TestValidator.predicate(
    "updatedAt should be same or later than original.updatedAt",
    new Date(updated.updatedAt).getTime() >=
      new Date(original.updatedAt).getTime(),
  );
}
