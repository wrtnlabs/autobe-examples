import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCaseSlaViolation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaViolation";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_case_sla_violations_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate an admin via POST /auth/admin/join to obtain auth context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!" as string & tags.Format<"password">,
    href: "https://admin.console.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.console.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy and one version so SLA configs can optionally link to it
  const policyCode = `refund_policy_${RandomGenerator.alphabets(6)}`;
  const businessPolicyBody = {
    policy_code: policyCode,
    name: "Refund SLA Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: businessPolicyBody },
    );
  typia.assert(businessPolicy);

  const policyVersionBody = {
    version_code: "v1",
    title: "Refund SLA Policy v1",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ targetHours: 48 }),
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCode,
        body: policyVersionBody,
      },
    );
  typia.assert(policyVersion);

  // 3. Create two SLA configurations with different (case_type, actor_role, action_type)
  const caseTypeRefund = "refund";
  const caseTypeDispute = "dispute";

  const slaConfigRefundBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: caseTypeRefund,
    actor_role: "seller",
    action_type: "final_decision",
    target_duration_seconds: 48 * 60 * 60,
    warning_duration_seconds: 24 * 60 * 60,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfigRefund: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigRefundBody,
    });
  typia.assert(slaConfigRefund);

  const slaConfigDisputeBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: caseTypeDispute,
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 24 * 60 * 60,
    warning_duration_seconds: 12 * 60 * 60,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfigDispute: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigDisputeBody,
    });
  typia.assert(slaConfigDispute);

  // Helper to perform a filtered search and assert basic invariants
  const searchAndAssert = async (
    body: IShoppingMallCaseSlaViolation.IRequest,
  ) => {
    const page: IPageIShoppingMallCaseSlaViolation.ISummary =
      await api.functional.shoppingMall.admin.caseSlaViolations.index(
        connection,
        {
          body,
        },
      );
    typia.assert(page);

    const pagination: IPage.IPagination = page.pagination;
    typia.assert(pagination);

    const { data } = page;

    // Check that pagination numbers are non-negative and consistent
    TestValidator.predicate(
      "pagination current non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit non-negative",
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      pagination.pages >= 0,
    );

    if (pagination.limit > 0 && pagination.pages > 0) {
      TestValidator.predicate(
        "current page within bounds",
        pagination.current <= pagination.pages,
      );
      TestValidator.predicate(
        "data length does not exceed limit",
        data.length <= pagination.limit,
      );
    }

    // When filters are defined, validate that returned rows respect them
    for (const violation of page.data) {
      typia.assert<IShoppingMallCaseSlaViolation.ISummary>(violation);

      if (body.case_type != null) {
        TestValidator.equals(
          "violation.case_type matches filter",
          violation.case_type,
          body.case_type,
        );
      }
      if (body.actor_role != null) {
        TestValidator.equals(
          "violation.actor_role matches filter",
          violation.actor_role,
          body.actor_role,
        );
      }
      if (body.action_type != null) {
        TestValidator.equals(
          "violation.action_type matches filter",
          violation.action_type,
          body.action_type,
        );
      }
      if (body.breach_duration_seconds_min != null) {
        TestValidator.predicate(
          "violation.breach_duration_seconds >= min",
          violation.breach_duration_seconds >= body.breach_duration_seconds_min,
        );
      }
      if (body.breach_duration_seconds_max != null) {
        TestValidator.predicate(
          "violation.breach_duration_seconds <= max",
          violation.breach_duration_seconds <= body.breach_duration_seconds_max,
        );
      }
      if (body.detected_from != null) {
        TestValidator.predicate(
          "violation.detected_at >= detected_from",
          violation.detected_at >= body.detected_from,
        );
      }
      if (body.detected_to != null) {
        TestValidator.predicate(
          "violation.detected_at <= detected_to",
          violation.detected_at <= body.detected_to,
        );
      }
    }

    // When orderBy is detected_at, check that the list is sorted by detected_at
    if (body.orderBy === "detected_at" && page.data.length >= 2) {
      const sortedCopy = [...page.data].sort((a, b) => {
        if (a.detected_at === b.detected_at) return 0;
        return a.detected_at < b.detected_at ? -1 : 1;
      });
      const isAscending = page.data.every((v, idx) => {
        if (idx === 0) return true;
        return page.data[idx - 1].detected_at <= v.detected_at;
      });
      const isDescending = page.data.every((v, idx) => {
        if (idx === 0) return true;
        return page.data[idx - 1].detected_at >= v.detected_at;
      });

      if (body.orderDirection === "asc") {
        TestValidator.equals(
          "violations sorted ascending by detected_at",
          isAscending,
          true,
        );
        TestValidator.equals(
          "sortedCopy ascending matches original when asc",
          page.data,
          sortedCopy,
        );
      } else if (body.orderDirection === "desc") {
        const sortedDesc = [...sortedCopy].reverse();
        TestValidator.equals(
          "violations sorted descending by detected_at",
          isDescending,
          true,
        );
        TestValidator.equals(
          "sortedCopy descending matches original when desc",
          page.data,
          sortedDesc,
        );
      }

      // At least confirm that either asc or desc condition holds
      TestValidator.predicate(
        "violations sorted by detected_at in some direction",
        isAscending || isDescending,
      );
    }

    return page;
  };

  // 4. Perform an advanced-filter search for the refund seller final_decision SLA violations
  const nowIso = new Date().toISOString();
  const detectedFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // last 7 days

  const advancedFilterBody: IShoppingMallCaseSlaViolation.IRequest = {
    case_type: caseTypeRefund,
    actor_role: "seller",
    action_type: "final_decision",
    shopping_mall_case_sla_config_id: slaConfigRefund.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_dispute_id: null,
    breach_duration_seconds_min: 60,
    breach_duration_seconds_max: 7 * 24 * 60 * 60,
    detected_from: detectedFrom,
    detected_to: nowIso,
    page: 1,
    pageSize: 10,
    orderBy: "detected_at",
    orderDirection: "desc",
  };

  const firstPage = await searchAndAssert(advancedFilterBody);

  // 5. Assert that adjusting page and pageSize changes the number of returned summaries when possible
  const secondPageBody: IShoppingMallCaseSlaViolation.IRequest = {
    ...advancedFilterBody,
    page: 2,
    pageSize: 5,
  };
  const secondPage = await searchAndAssert(secondPageBody);

  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "second page size is <= requested pageSize",
      secondPage.data.length <= (secondPageBody.pageSize ?? 0),
    );
  }

  // 6. Confirm that when filters are too restrictive, we get an empty data array but valid pagination
  const restrictiveBody: IShoppingMallCaseSlaViolation.IRequest = {
    ...advancedFilterBody,
    breach_duration_seconds_min:
      (firstPage.data[0]?.breach_duration_seconds ?? 0) + 10_000_000,
    breach_duration_seconds_max: null,
    page: 1,
    pageSize: 10,
  };

  const restrictivePage = await searchAndAssert(restrictiveBody);

  TestValidator.equals(
    "restrictive filter returns zero data length",
    restrictivePage.data.length,
    0,
  );
}
