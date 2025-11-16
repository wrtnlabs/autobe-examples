import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSummary";

export async function test_api_seller_performance_summaries_filter_by_risk_level(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also sets Authorization header via SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call sellerPerformanceSummaries search with riskLevels = ["high"]
  const requestBody = {
    sellerIds: undefined,
    periodStartFrom: null,
    periodStartTo: null,
    periodEndFrom: null,
    periodEndTo: null,
    minOrdersCount: null,
    maxOrdersCount: null,
    minAverageRating: null,
    maxAverageRating: null,
    riskLevels: ["high"],
    hasRiskReasonSummary: null,
    page: 1 as number & tags.Type<"int32">,
    pageSize: 50 as number & tags.Type<"int32">,
    orderBy: "risk_score",
    orderDirection: "desc",
  } satisfies IShoppingMallSellerPerformanceSummary.IRequest;

  const page: IPageIShoppingMallSellerPerformanceSummary.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSummary.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 3. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page index should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive or zero",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  const summaries: IShoppingMallSellerPerformanceSummary.ISummary[] = page.data;

  // 4. If there are any results, verify: all risk_level are "high" and sorted by risk_score desc
  if (summaries.length > 0) {
    // All items must have risk_level === "high"
    for (const summary of summaries) {
      typia.assert<IShoppingMallSellerPerformanceSummary.ISummary>(summary);
      TestValidator.equals(
        "each summary risk_level should match filter 'high'",
        summary.risk_level,
        "high",
      );

      // High risk profile should have non-zero risk_score and at least one risk indicator
      TestValidator.predicate(
        "high risk summary should have positive risk_score",
        summary.risk_score > 0,
      );
      TestValidator.predicate(
        "high risk summary should have some risk indicator (cancellation/return/dispute/fraud)",
        summary.cancellation_rate > 0 ||
          summary.return_rate > 0 ||
          summary.dispute_resolution_sla_breach_rate > 0 ||
          summary.fraud_rule_violation_count > 0,
      );
    }

    // Verify sorting by risk_score desc within this page
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      TestValidator.predicate(
        "results should be ordered by risk_score in descending order",
        prev.risk_score >= curr.risk_score,
      );
    }

    // Pagination.records should be at least the number of items in this page
    TestValidator.predicate(
      "pagination.records should be >= number of returned summaries",
      pagination.records >= summaries.length,
    );
  }
}
