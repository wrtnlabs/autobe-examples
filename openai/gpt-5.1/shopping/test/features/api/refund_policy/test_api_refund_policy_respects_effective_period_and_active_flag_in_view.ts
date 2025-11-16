import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";

export async function test_api_refund_policy_respects_effective_period_and_active_flag_in_view(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized connection
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // Fix reference time "now" so that all date decisions are consistent
  const now: Date = new Date();

  const toIso = (date: Date): string => date.toISOString();

  // Helper to create refund policies with minimal boilerplate
  const createPolicy = async (
    input: Omit<
      IShoppingMallRefundPolicy.ICreate,
      "name" | "refundWindowDays" | "maxRefundRate"
    > & {
      name?: string;
      refundWindowDays?: number;
      maxRefundRate?: number;
    },
  ): Promise<IShoppingMallRefundPolicy> => {
    const body = {
      code: input.code,
      name: input.name ?? RandomGenerator.paragraph({ sentences: 2 }),
      description: input.description,
      allowFullRefund: input.allowFullRefund,
      allowPartialRefund: input.allowPartialRefund,
      refundWindowDays: input.refundWindowDays ?? 30,
      maxRefundRate: input.maxRefundRate ?? 1.0,
      requireManualApprovalOverAmount: input.requireManualApprovalOverAmount,
      configurationPayload: input.configurationPayload,
      isActive: input.isActive,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      regionCode: input.regionCode,
      policySettingCode: input.policySettingCode,
    } satisfies IShoppingMallRefundPolicy.ICreate;

    const created: IShoppingMallRefundPolicy =
      await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  };

  // 2. Create an active and currently effective policy
  const activeEffectiveCode = `active_effective_${RandomGenerator.alphaNumeric(6)}`;
  const activeEffectiveFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
  const activeEffectiveUntil: string | null = null; // open-ended

  const activeEffective = await createPolicy({
    code: activeEffectiveCode,
    description: "Active and currently effective refund policy",
    allowFullRefund: true,
    allowPartialRefund: true,
    isActive: true,
    effectiveFrom: toIso(activeEffectiveFrom),
    effectiveUntil: activeEffectiveUntil,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
  });

  // 3. Create an inactive policy
  const inactiveCode = `inactive_${RandomGenerator.alphaNumeric(6)}`;
  const inactiveEffectiveFrom: string | null = toIso(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );
  const inactiveEffectiveUntil: string | null = toIso(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );

  const inactive = await createPolicy({
    code: inactiveCode,
    description: "Inactive refund policy",
    allowFullRefund: true,
    allowPartialRefund: true,
    isActive: false,
    effectiveFrom: inactiveEffectiveFrom,
    effectiveUntil: inactiveEffectiveUntil,
    refundWindowDays: 14,
    maxRefundRate: 0.5,
  });

  // 4. Create an expired policy
  const expiredCode = `expired_${RandomGenerator.alphaNumeric(6)}`;
  const expiredEffectiveFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ); // 7 days ago
  const expiredEffectiveUntil = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday

  const expired = await createPolicy({
    code: expiredCode,
    description: "Expired refund policy",
    allowFullRefund: true,
    allowPartialRefund: true,
    isActive: true,
    effectiveFrom: toIso(expiredEffectiveFrom),
    effectiveUntil: toIso(expiredEffectiveUntil),
    refundWindowDays: 7,
    maxRefundRate: 0.8,
  });

  // Helper to classify lifecycle based on fields exposed in the view
  const classifyLifecycle = (
    policy: IShoppingMallRefundPolicy,
    refNow: Date,
  ): "effective" | "inactive" | "expired" => {
    if (!policy.isActive) return "inactive";

    const from = policy.effectiveFrom
      ? new Date(policy.effectiveFrom)
      : undefined;
    const until = policy.effectiveUntil
      ? new Date(policy.effectiveUntil)
      : undefined;

    if (until !== undefined && refNow > until) return "expired";
    if (from !== undefined && refNow < from) return "inactive";
    return "effective";
  };

  // 5. Fetch each policy via detail view and validate lifecycle semantics

  const fetchedActiveEffective: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.at(
      connection,
      { refundPolicyCode: activeEffective.code },
    );
  typia.assert(fetchedActiveEffective);

  const fetchedInactive: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.at(
      connection,
      { refundPolicyCode: inactive.code },
    );
  typia.assert(fetchedInactive);

  const fetchedExpired: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.at(
      connection,
      { refundPolicyCode: expired.code },
    );
  typia.assert(fetchedExpired);

  // 6. Validate that key configuration fields are preserved round-trip
  TestValidator.equals(
    "active/effective policy matches configuration (code)",
    fetchedActiveEffective.code,
    activeEffective.code,
  );
  TestValidator.equals(
    "inactive policy matches configuration (code)",
    fetchedInactive.code,
    inactive.code,
  );
  TestValidator.equals(
    "expired policy matches configuration (code)",
    fetchedExpired.code,
    expired.code,
  );

  TestValidator.equals(
    "active/effective isActive flag persists",
    fetchedActiveEffective.isActive,
    activeEffective.isActive,
  );
  TestValidator.equals(
    "inactive policy isActive flag persists",
    fetchedInactive.isActive,
    inactive.isActive,
  );
  TestValidator.equals(
    "expired policy isActive flag persists",
    fetchedExpired.isActive,
    expired.isActive,
  );

  TestValidator.equals(
    "active/effective effectiveFrom persists",
    fetchedActiveEffective.effectiveFrom,
    activeEffective.effectiveFrom,
  );
  TestValidator.equals(
    "active/effective effectiveUntil persists",
    fetchedActiveEffective.effectiveUntil,
    activeEffective.effectiveUntil,
  );

  TestValidator.equals(
    "inactive effectiveFrom persists",
    fetchedInactive.effectiveFrom,
    inactive.effectiveFrom,
  );
  TestValidator.equals(
    "inactive effectiveUntil persists",
    fetchedInactive.effectiveUntil,
    inactive.effectiveUntil,
  );

  TestValidator.equals(
    "expired effectiveFrom persists",
    fetchedExpired.effectiveFrom,
    expired.effectiveFrom,
  );
  TestValidator.equals(
    "expired effectiveUntil persists",
    fetchedExpired.effectiveUntil,
    expired.effectiveUntil,
  );

  // 7. Validate lifecycle classification based solely on fields exposed by detail view
  const expectedActiveEffectiveLifecycle = "effective" as const;
  const expectedInactiveLifecycle = "inactive" as const;
  const expectedExpiredLifecycle = "expired" as const;

  const actualActiveEffectiveLifecycle = classifyLifecycle(
    fetchedActiveEffective,
    now,
  );
  const actualInactiveLifecycle = classifyLifecycle(fetchedInactive, now);
  const actualExpiredLifecycle = classifyLifecycle(fetchedExpired, now);

  TestValidator.equals(
    "active/effective policy classified as effective",
    actualActiveEffectiveLifecycle,
    expectedActiveEffectiveLifecycle,
  );
  TestValidator.equals(
    "inactive policy classified as inactive",
    actualInactiveLifecycle,
    expectedInactiveLifecycle,
  );
  TestValidator.equals(
    "expired policy classified as expired",
    actualExpiredLifecycle,
    expectedExpiredLifecycle,
  );
}
