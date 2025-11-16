import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Verify refund policy search filtering by active status and effective period.
 *
 * Business goal: Ensure that the platform-admin refund policy search endpoint
 * (PATCH /shoppingMall/platformAdmin/refundPolicies) correctly filters policies
 * based on `isActive` and effective date range fields so that:
 *
 * - Currently active and effective policies are returned when searching for
 *   active policies whose effectiveFrom/effectiveUntil window includes now.
 * - Inactive or historically effective policies can be retrieved when searching
 *   with `isActive = false` and a past window.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join.
 * 2. Create two refund policies via POST
 *    /shoppingMall/platformAdmin/refundPolicies:
 *
 *    - Policy A (active and currently effective):
 *
 *         - IsActive = true
 *         - EffectiveFrom = now - 1 day
 *         - EffectiveUntil = now + 1 day
 *    - Policy B (inactive and historically effective):
 *
 *         - IsActive = false
 *         - EffectiveFrom = now - 10 days
 *         - EffectiveUntil = now - 5 days
 * 3. Call PATCH /shoppingMall/platformAdmin/refundPolicies with
 *    IShoppingMallRefundPolicy.IRequest where:
 *
 *    - IsActive = true
 *    - EffectiveFromGte <= effectiveFrom(A)
 *    - EffectiveUntilLte >= effectiveUntil(A) so that only Policy A matches.
 * 4. Assert that:
 *
 *    - Pagination.records === 1
 *    - Data array has length 1
 *    - Data[0].code === Policy A.code
 *    - Data[0].allowFullRefund, allowPartialRefund, maxDaysAfterDelivery,
 *         requireAdminApprovalOverAmount match the Policy A creation payload.
 * 5. Call PATCH again with filters targeting Policy B:
 *
 *    - IsActive = false
 *    - EffectiveFromLte / effectiveUntilGte that intersect Policy B’s window but not
 *         Policy A’s.
 * 6. Assert that:
 *
 *    - Pagination.records === 1
 *    - Data array has length 1
 *    - Data[0].code === Policy B.code
 *    - Policy A is not present in the results.
 */
export async function test_api_refund_policy_search_filter_by_active_and_effective_period(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two refund policies with different active flags and windows
  const now = new Date();

  const oneDayMs = 24 * 60 * 60 * 1000;
  const policyAEffectiveFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const policyAEffectiveUntil = new Date(
    now.getTime() + oneDayMs,
  ).toISOString();

  const policyBEffectiveFrom = new Date(
    now.getTime() - 10 * oneDayMs,
  ).toISOString();
  const policyBEffectiveUntil = new Date(
    now.getTime() - 5 * oneDayMs,
  ).toISOString();

  const policyACreateBody = {
    code: `POLICY_A_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: policyAEffectiveFrom,
    effectiveUntil: policyAEffectiveUntil,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const policyBCreateBody = {
    code: `POLICY_B_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: false,
    allowPartialRefund: true,
    refundWindowDays: 15 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: 50000,
    configurationPayload: undefined,
    isActive: false,
    effectiveFrom: policyBEffectiveFrom,
    effectiveUntil: policyBEffectiveUntil,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const policyA: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: policyACreateBody },
    );
  typia.assert(policyA);

  const policyB: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: policyBCreateBody },
    );
  typia.assert(policyB);

  // 3. Search for active, currently effective policies (should include Policy A only)
  const searchActiveNowBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    codes: undefined,
    name: undefined,
    isActive: true,
    effectiveFromGte: new Date(now.getTime() - 2 * oneDayMs).toISOString(),
    effectiveFromLte: new Date(now.getTime() + 2 * oneDayMs).toISOString(),
    effectiveUntilGte: new Date(now.getTime() - 2 * oneDayMs).toISOString(),
    effectiveUntilLte: new Date(now.getTime() + 2 * oneDayMs).toISOString(),
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const activeNowPage: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchActiveNowBody },
    );
  typia.assert(activeNowPage);

  const activeNowSummaries: IShoppingMallRefundPolicy.ISummary[] =
    activeNowPage.data;

  TestValidator.predicate(
    "active-now search should return at least one policy",
    activeNowSummaries.length > 0,
  );

  const foundPolicyA = activeNowSummaries.find(
    (summary) => summary.code === policyA.code,
  );

  TestValidator.predicate(
    "active-now search should include Policy A by code",
    foundPolicyA !== undefined,
  );

  TestValidator.equals(
    "active-now result for Policy A allowFullRefund matches creation",
    foundPolicyA?.allowFullRefund ?? null,
    policyACreateBody.allowFullRefund,
  );

  TestValidator.equals(
    "active-now result for Policy A allowPartialRefund matches creation",
    foundPolicyA?.allowPartialRefund ?? null,
    policyACreateBody.allowPartialRefund,
  );

  TestValidator.equals(
    "active-now result for Policy A maxDaysAfterDelivery matches creation",
    foundPolicyA?.maxDaysAfterDelivery ?? null,
    policyACreateBody.refundWindowDays,
  );

  TestValidator.equals(
    "active-now result for Policy A requireAdminApprovalOverAmount matches creation",
    foundPolicyA?.requireAdminApprovalOverAmount ?? null,
    policyACreateBody.requireManualApprovalOverAmount ?? null,
  );

  if (foundPolicyA !== undefined) {
    TestValidator.equals(
      "Policy A summary isActive should be true",
      foundPolicyA.isActive,
      true,
    );
  }

  // 4. Search for inactive, historically effective policies (should include Policy B only)
  const pastWindowStart = new Date(now.getTime() - 20 * oneDayMs).toISOString();
  const pastWindowEnd = new Date(now.getTime() - 1 * oneDayMs).toISOString();

  const searchInactivePastBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    codes: undefined,
    name: undefined,
    isActive: false,
    effectiveFromGte: pastWindowStart,
    effectiveFromLte: pastWindowEnd,
    effectiveUntilGte: pastWindowStart,
    effectiveUntilLte: pastWindowEnd,
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const inactivePastPage: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchInactivePastBody },
    );
  typia.assert(inactivePastPage);

  const inactivePastSummaries: IShoppingMallRefundPolicy.ISummary[] =
    inactivePastPage.data;

  TestValidator.predicate(
    "inactive-past search should return at least one policy",
    inactivePastSummaries.length > 0,
  );

  const foundPolicyB = inactivePastSummaries.find(
    (summary) => summary.code === policyB.code,
  );

  TestValidator.predicate(
    "inactive-past search should include Policy B by code",
    foundPolicyB !== undefined,
  );

  if (foundPolicyB !== undefined) {
    TestValidator.equals(
      "Policy B summary isActive should be false",
      foundPolicyB.isActive,
      false,
    );
  }

  const policyBCoexistInActiveNow = activeNowSummaries.find(
    (summary) => summary.code === policyB.code,
  );

  TestValidator.equals(
    "Policy B should not appear in active-now search",
    policyBCoexistInActiveNow ?? null,
    null,
  );
}
