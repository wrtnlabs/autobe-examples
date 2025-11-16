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
 * Ensure deleting one refund policy by its business code does not affect other
 * policies.
 *
 * Business context: Platform administrators manage refund policies that may
 * share common region and policy-setting profiles. Deleting a specific refund
 * policy by its business code must only remove that single policy and must not
 * impact other policies that reference the same region or policy setting
 * configuration.
 *
 * Steps:
 *
 * 1. Register a platform admin (join) and obtain an authorized session.
 * 2. Create a region configuration entry.
 * 3. Create a policy setting profile.
 * 4. Create a cancellation policy referencing the region and policy setting (for
 *    realism).
 * 5. Create two refund policies that share regionCode and policySettingCode but
 *    have distinct policy codes.
 * 6. Delete the first refund policy by its business code.
 * 7. Assert that the call succeeds without throwing and that the second policy
 *    object created earlier remains intact (logical isolation check, since no
 *    GET/list endpoint is available).
 * 8. Optionally delete the second policy as a follow-up to confirm it is still
 *    independently deletable.
 */
export async function test_api_refund_policy_delete_does_not_affect_other_policies(
  connection: api.IConnection,
) {
  // 1. Register platform admin and establish authenticated session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region configuration
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
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
      { body: regionBody },
    );
  typia.assert(region);

  // 3. Create a policy setting profile
  const policySettingCode = `POLICY_SETTING_${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const effectiveTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingBody = {
    code: policySettingCode,
    name: "Default refund/cancellation profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ kind: "refund", version: 1 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 4. Create a cancellation policy scoped to the same region and policy setting
  const cancellationPolicyBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default cancellation policy for refund tests",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ windowHours: 72 }),
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
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

  // 5. Create two refund policies that share region and policy setting
  const baseRefundConfig = {
    refundWindowDays: 14 as number,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ windowDays: 14, maxRate: 1.0 }),
    isActive: true,
    effectiveFrom,
    effectiveUntil: effectiveTo,
    regionCode,
    policySettingCode,
  };

  const refundPolicyBodyA = {
    code: `REFUND_A_${RandomGenerator.alphaNumeric(4)}`,
    name: "Refund policy A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: baseRefundConfig.refundWindowDays,
    maxRefundRate: baseRefundConfig.maxRefundRate,
    requireManualApprovalOverAmount:
      baseRefundConfig.requireManualApprovalOverAmount,
    configurationPayload: baseRefundConfig.configurationPayload,
    isActive: baseRefundConfig.isActive,
    effectiveFrom: baseRefundConfig.effectiveFrom,
    effectiveUntil: baseRefundConfig.effectiveUntil,
    regionCode: baseRefundConfig.regionCode,
    policySettingCode: baseRefundConfig.policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicyA: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBodyA },
    );
  typia.assert(refundPolicyA);

  const refundPolicyBodyB = {
    code: `REFUND_B_${RandomGenerator.alphaNumeric(4)}`,
    name: "Refund policy B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: baseRefundConfig.refundWindowDays,
    maxRefundRate: baseRefundConfig.maxRefundRate,
    requireManualApprovalOverAmount:
      baseRefundConfig.requireManualApprovalOverAmount,
    configurationPayload: baseRefundConfig.configurationPayload,
    isActive: baseRefundConfig.isActive,
    effectiveFrom: baseRefundConfig.effectiveFrom,
    effectiveUntil: baseRefundConfig.effectiveUntil,
    regionCode: baseRefundConfig.regionCode,
    policySettingCode: baseRefundConfig.policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicyB: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBodyB },
    );
  typia.assert(refundPolicyB);

  // Snapshot key fields from refundPolicyB for later logical comparison
  const snapshotPolicyB = {
    code: refundPolicyB.code,
    name: refundPolicyB.name,
    isActive: refundPolicyB.isActive,
    maxRefundRate: refundPolicyB.maxRefundRate,
    regionCode: refundPolicyB.regionCode,
    policySettingCode: refundPolicyB.policySettingCode,
  };

  // 6. Delete the first refund policy by its business code
  await api.functional.shoppingMall.platformAdmin.refundPolicies.erase(
    connection,
    { refundPolicyCode: refundPolicyA.code },
  );

  // 7. Logical assertion that the second policy remains unaffected in our snapshot
  TestValidator.equals(
    "second refund policy snapshot remains unchanged after deleting first policy",
    snapshotPolicyB,
    {
      code: refundPolicyB.code,
      name: refundPolicyB.name,
      isActive: refundPolicyB.isActive,
      maxRefundRate: refundPolicyB.maxRefundRate,
      regionCode: refundPolicyB.regionCode,
      policySettingCode: refundPolicyB.policySettingCode,
    },
  );

  // 8. Optionally delete the second policy to ensure it is still independently deletable
  await api.functional.shoppingMall.platformAdmin.refundPolicies.erase(
    connection,
    { refundPolicyCode: refundPolicyB.code },
  );
}
