import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";

/**
 * Validate creation of refund policies with various lifecycle states.
 *
 * Business purpose:
 *
 * - Ensure a platform admin can create refund policies that are immediately
 *   active, scheduled for future activation, or inactive, via a single creation
 *   API.
 * - Confirm that lifecycle-related flags and timestamps (isActive, effectiveFrom,
 *   effectiveUntil) and core configuration fields are persisted as requested.
 *
 * Steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 2. Using the authenticated connection, create three refund policies via POST
 *    /shoppingMall/platformAdmin/refundPolicies with different lifecycle
 *    configurations:
 *
 *    - Always_active: active immediately with no effective period bounds.
 *    - Scheduled_future: active, but only effective starting from a future
 *         timestamp.
 *    - Inactive: marked inactive, but with a defined effective period window.
 * 3. For each created policy, assert that:
 *
 *    - Lifecycle fields in the response mirror the request body.
 *    - Core configuration fields (code, name, maxRefundRate, allowFullRefund,
 *         allowPartialRefund, requireManualApprovalOverAmount,
 *         configurationPayload, regionCode, policySettingCode) are echoed
 *         correctly.
 *    - CreatedAt and updatedAt are populated and ordered sensibly.
 */
export async function test_api_refund_policy_creation_with_various_lifecycle_states(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to bootstrap authentication context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
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

  const now = new Date();

  // Helper values for future/past effective dates.
  const oneDayMs = 24 * 60 * 60 * 1000;
  const futureFrom = new Date(now.getTime() + oneDayMs).toISOString();
  const pastFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const pastUntil = new Date(now.getTime() + 2 * oneDayMs).toISOString();

  // 2a. Always-active policy: active immediately, no effective bounds.
  const alwaysActiveCode = `always_active_${RandomGenerator.alphaNumeric(8)}`;
  const alwaysActiveBody = {
    code: alwaysActiveCode,
    name: "Always Active Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      type: "always",
      notes: "Full refund anytime within window",
    }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const alwaysActivePolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: alwaysActiveBody },
    );
  typia.assert(alwaysActivePolicy);

  // Validate lifecycle fields and core echoes for always-active policy.
  TestValidator.equals(
    "always_active: isActive should match request",
    alwaysActivePolicy.isActive,
    alwaysActiveBody.isActive,
  );
  TestValidator.equals(
    "always_active: effectiveFrom should be null",
    alwaysActivePolicy.effectiveFrom ?? null,
    alwaysActiveBody.effectiveFrom,
  );
  TestValidator.equals(
    "always_active: effectiveUntil should be null",
    alwaysActivePolicy.effectiveUntil ?? null,
    alwaysActiveBody.effectiveUntil,
  );
  TestValidator.equals(
    "always_active: code should echo request",
    alwaysActivePolicy.code,
    alwaysActiveBody.code,
  );
  TestValidator.equals(
    "always_active: name should echo request",
    alwaysActivePolicy.name,
    alwaysActiveBody.name,
  );
  TestValidator.equals(
    "always_active: maxRefundRate should echo request",
    alwaysActivePolicy.maxRefundRate,
    alwaysActiveBody.maxRefundRate,
  );
  TestValidator.equals(
    "always_active: allowFullRefund should echo request",
    alwaysActivePolicy.allowFullRefund,
    alwaysActiveBody.allowFullRefund,
  );
  TestValidator.equals(
    "always_active: allowPartialRefund should echo request",
    alwaysActivePolicy.allowPartialRefund,
    alwaysActiveBody.allowPartialRefund,
  );
  TestValidator.equals(
    "always_active: requireManualApprovalOverAmount maps to requireAdminApprovalOverAmount",
    alwaysActivePolicy.requireAdminApprovalOverAmount ?? null,
    alwaysActiveBody.requireManualApprovalOverAmount ?? null,
  );
  TestValidator.equals(
    "always_active: configurationPayload should echo request",
    alwaysActivePolicy.configurationPayload ?? null,
    alwaysActiveBody.configurationPayload ?? null,
  );
  TestValidator.equals(
    "always_active: regionCode should echo request",
    alwaysActivePolicy.regionCode ?? null,
    alwaysActiveBody.regionCode ?? null,
  );
  TestValidator.equals(
    "always_active: policySettingCode should echo request",
    alwaysActivePolicy.policySettingCode ?? null,
    alwaysActiveBody.policySettingCode ?? null,
  );
  TestValidator.equals(
    "always_active: deletedAt should be undefined on creation",
    alwaysActivePolicy.deletedAt ?? null,
    null,
  );
  TestValidator.predicate(
    "always_active: createdAt should be non-empty ISO string",
    alwaysActivePolicy.createdAt.length > 0,
  );
  TestValidator.predicate(
    "always_active: updatedAt should be non-empty ISO string",
    alwaysActivePolicy.updatedAt.length > 0,
  );

  // 2b. Scheduled future policy.
  const scheduledCode = `scheduled_future_${RandomGenerator.alphaNumeric(8)}`;
  const scheduledBody = {
    code: scheduledCode,
    name: "Scheduled Future Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.8,
    requireManualApprovalOverAmount: 50000,
    configurationPayload: JSON.stringify({
      type: "scheduled",
      notes: "Future effective policy",
    }),
    isActive: true,
    effectiveFrom: futureFrom as string & tags.Format<"date-time">,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const scheduledPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: scheduledBody },
    );
  typia.assert(scheduledPolicy);

  TestValidator.equals(
    "scheduled_future: isActive should match request",
    scheduledPolicy.isActive,
    scheduledBody.isActive,
  );
  TestValidator.equals(
    "scheduled_future: effectiveFrom should echo request",
    scheduledPolicy.effectiveFrom,
    scheduledBody.effectiveFrom,
  );
  TestValidator.equals(
    "scheduled_future: effectiveUntil should be null",
    scheduledPolicy.effectiveUntil ?? null,
    scheduledBody.effectiveUntil,
  );
  TestValidator.predicate(
    "scheduled_future: effectiveFrom should be in the future relative to now",
    new Date(scheduledPolicy.effectiveFrom ?? futureFrom).getTime() >
      now.getTime(),
  );

  TestValidator.equals(
    "scheduled_future: code should echo request",
    scheduledPolicy.code,
    scheduledBody.code,
  );
  TestValidator.equals(
    "scheduled_future: name should echo request",
    scheduledPolicy.name,
    scheduledBody.name,
  );
  TestValidator.equals(
    "scheduled_future: maxRefundRate should echo request",
    scheduledPolicy.maxRefundRate,
    scheduledBody.maxRefundRate,
  );
  TestValidator.equals(
    "scheduled_future: allowFullRefund should echo request",
    scheduledPolicy.allowFullRefund,
    scheduledBody.allowFullRefund,
  );
  TestValidator.equals(
    "scheduled_future: allowPartialRefund should echo request",
    scheduledPolicy.allowPartialRefund,
    scheduledBody.allowPartialRefund,
  );
  TestValidator.equals(
    "scheduled_future: requireManualApprovalOverAmount maps to requireAdminApprovalOverAmount",
    scheduledPolicy.requireAdminApprovalOverAmount ?? null,
    scheduledBody.requireManualApprovalOverAmount ?? null,
  );
  TestValidator.equals(
    "scheduled_future: configurationPayload should echo request",
    scheduledPolicy.configurationPayload ?? null,
    scheduledBody.configurationPayload ?? null,
  );
  TestValidator.equals(
    "scheduled_future: deletedAt should be undefined on creation",
    scheduledPolicy.deletedAt ?? null,
    null,
  );

  // 2c. Inactive policy with defined effective window.
  const inactiveCode = `inactive_${RandomGenerator.alphaNumeric(8)}`;
  const inactiveBody = {
    code: inactiveCode,
    name: "Inactive Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: false,
    allowPartialRefund: true,
    refundWindowDays: 7 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: JSON.stringify({
      type: "inactive",
      notes: "Disabled policy",
    }),
    isActive: false,
    effectiveFrom: pastFrom as string & tags.Format<"date-time">,
    effectiveUntil: pastUntil as string & tags.Format<"date-time">,
    regionCode: "KR",
    policySettingCode: "DEFAULT",
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const inactivePolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: inactiveBody },
    );
  typia.assert(inactivePolicy);

  TestValidator.equals(
    "inactive: isActive should match request",
    inactivePolicy.isActive,
    inactiveBody.isActive,
  );
  TestValidator.equals(
    "inactive: effectiveFrom should echo request",
    inactivePolicy.effectiveFrom,
    inactiveBody.effectiveFrom,
  );
  TestValidator.equals(
    "inactive: effectiveUntil should echo request",
    inactivePolicy.effectiveUntil,
    inactiveBody.effectiveUntil,
  );
  TestValidator.equals(
    "inactive: code should echo request",
    inactivePolicy.code,
    inactiveBody.code,
  );
  TestValidator.equals(
    "inactive: name should echo request",
    inactivePolicy.name,
    inactiveBody.name,
  );
  TestValidator.equals(
    "inactive: maxRefundRate should echo request",
    inactivePolicy.maxRefundRate,
    inactiveBody.maxRefundRate,
  );
  TestValidator.equals(
    "inactive: allowFullRefund should echo request",
    inactivePolicy.allowFullRefund,
    inactiveBody.allowFullRefund,
  );
  TestValidator.equals(
    "inactive: allowPartialRefund should echo request",
    inactivePolicy.allowPartialRefund,
    inactiveBody.allowPartialRefund,
  );
  TestValidator.equals(
    "inactive: requireManualApprovalOverAmount maps to requireAdminApprovalOverAmount",
    inactivePolicy.requireAdminApprovalOverAmount ?? null,
    inactiveBody.requireManualApprovalOverAmount ?? null,
  );
  TestValidator.equals(
    "inactive: configurationPayload should echo request",
    inactivePolicy.configurationPayload ?? null,
    inactiveBody.configurationPayload ?? null,
  );
  TestValidator.equals(
    "inactive: regionCode should echo request",
    inactivePolicy.regionCode ?? null,
    inactiveBody.regionCode ?? null,
  );
  TestValidator.equals(
    "inactive: policySettingCode should echo request",
    inactivePolicy.policySettingCode ?? null,
    inactiveBody.policySettingCode ?? null,
  );
  TestValidator.equals(
    "inactive: deletedAt should be undefined on creation",
    inactivePolicy.deletedAt ?? null,
    null,
  );

  // Basic temporal sanity: createdAt <= updatedAt for one of the policies.
  TestValidator.predicate(
    "createdAt should not be after updatedAt for always_active policy",
    new Date(alwaysActivePolicy.createdAt).getTime() <=
      new Date(alwaysActivePolicy.updatedAt).getTime(),
  );
}
