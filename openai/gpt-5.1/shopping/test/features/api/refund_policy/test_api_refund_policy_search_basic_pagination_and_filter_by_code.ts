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
 * Search refund policies with pagination and code filter as a platform admin.
 *
 * Business purpose: Ensure that a platform administrator can create multiple
 * refund policies and later retrieve them using the search endpoint with basic
 * pagination and a codes filter, validating that only matching policies are
 * returned and that pagination metadata is consistent.
 *
 * Steps:
 *
 * 1. Join as a platform admin to obtain an authorized admin session.
 * 2. Create multiple refund policies with distinct codes and names, all active and
 *    in an effective period that covers "now".
 * 3. Call the refund policy search endpoint with a filter that selects a single
 *    code and with basic pagination and sorting settings.
 * 4. Verify pagination metadata (limit, records, pages) and ensure at least one
 *    result for the filtered code.
 * 5. Validate that the returned summary for the filtered code matches the created
 *    policy and that policies with other codes are not present.
 */
export async function test_api_refund_policy_search_basic_pagination_and_filter_by_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  TestValidator.predicate(
    "platform admin session must be active",
    admin.isActive === true,
  );

  // 2. Create multiple refund policies with distinct codes and names.
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const baseCode = RandomGenerator.alphaNumeric(8);

  const createPolicyA = {
    code: `${baseCode}-A`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 50000,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const policyA: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: createPolicyA,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(policyA);

  const createPolicyB = {
    code: `${baseCode}-B`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: false,
    refundWindowDays: 7 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const policyB: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: createPolicyB,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(policyB);

  const createPolicyC = {
    code: `${baseCode}-C`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: false,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.8,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const policyC: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: createPolicyC,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(policyC);

  // 3. Search refund policies filtered by policyB.code with pagination.
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchRequest = {
    page: requestPage,
    limit: requestLimit,
    search: undefined,
    codes: [policyB.code],
    name: undefined,
    isActive: true,
    effectiveFromGte: undefined,
    effectiveFromLte: undefined,
    effectiveUntilGte: undefined,
    effectiveUntilLte: undefined,
    orderBy: "code" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const pageResult: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallRefundPolicy.ISummary>(pageResult);

  // 4. Validate pagination metadata.
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be at least one for filtered code",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least one for filtered code",
    pagination.pages >= 1,
  );

  // 5. Validate that data contains the summary for policyB and matches key fields.
  const summaries: IShoppingMallRefundPolicy.ISummary[] = pageResult.data;

  TestValidator.predicate(
    "search result must contain at least one summary",
    summaries.length >= 1,
  );

  const summaryB = summaries.find((s) => s.code === policyB.code);
  TestValidator.predicate(
    "search result must contain summary for policyB",
    summaryB !== undefined,
  );

  if (summaryB !== undefined) {
    TestValidator.equals(
      "summaryB code should match created policyB code",
      summaryB.code,
      policyB.code,
    );
    TestValidator.equals(
      "summaryB name should match created policyB name",
      summaryB.name,
      policyB.name,
    );
    TestValidator.equals(
      "summaryB isActive should be true",
      summaryB.isActive,
      true,
    );
    TestValidator.equals(
      "summaryB allowFullRefund should match created policyB",
      summaryB.allowFullRefund,
      createPolicyB.allowFullRefund,
    );
    TestValidator.equals(
      "summaryB allowPartialRefund should match created policyB",
      summaryB.allowPartialRefund,
      createPolicyB.allowPartialRefund,
    );
    TestValidator.equals(
      "summaryB maxDaysAfterDelivery should match created policyB",
      summaryB.maxDaysAfterDelivery,
      createPolicyB.refundWindowDays as number & tags.Type<"int32">,
    );
    TestValidator.equals(
      "summaryB requireAdminApprovalOverAmount should match created policyB",
      summaryB.requireAdminApprovalOverAmount,
      createPolicyB.requireManualApprovalOverAmount,
    );
  }

  // 6. Ensure policies not matching the filtered code do not appear.
  const hasPolicyA = summaries.some((s) => s.code === policyA.code);
  const hasPolicyC = summaries.some((s) => s.code === policyC.code);

  TestValidator.predicate(
    "search result must not contain policyA with different code",
    hasPolicyA === false,
  );
  TestValidator.predicate(
    "search result must not contain policyC with different code",
    hasPolicyC === false,
  );
}
