import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatistics";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_statistics_admin_activities_empty_activity_window(
  connection: api.IConnection,
) {
  // 1. Register a brand-new admin via POST /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // 2. Immediately call GET /shoppingMall/admin/statistics/adminActivities
  const stats: IShoppingMallAdminActivityStatistics =
    await api.functional.shoppingMall.admin.statistics.adminActivities.index(
      connection,
    );
  typia.assert<IShoppingMallAdminActivityStatistics>(stats);

  // 3. Business assertions for an effectively idle system
  // 3-1. Total actions should be exactly 0
  TestValidator.equals(
    "totalActions should be zero for brand-new admin with no activity",
    stats.totalActions,
    0,
  );

  // 3-2. uniqueAdminsActive should not be greater than 1
  TestValidator.predicate(
    "uniqueAdminsActive must be between 0 and 1 after a single join",
    stats.uniqueAdminsActive >= 0 && stats.uniqueAdminsActive <= 1,
  );

  // 3-3. disputesResolvedCount and policyOverridesCount must be 0
  TestValidator.equals(
    "disputesResolvedCount should be zero in idle system",
    stats.disputesResolvedCount,
    0,
  );
  TestValidator.equals(
    "policyOverridesCount should be zero in idle system",
    stats.policyOverridesCount,
    0,
  );

  // 3-4. KPI summary numeric fields must all be 0
  TestValidator.equals(
    "ordersProcessed KPI should be zero in idle system",
    stats.kpis.ordersProcessed,
    0,
  );
  TestValidator.equals(
    "refundsProcessed KPI should be zero in idle system",
    stats.kpis.refundsProcessed,
    0,
  );
  TestValidator.equals(
    "disputesClosed KPI should be zero in idle system",
    stats.kpis.disputesClosed,
    0,
  );
  TestValidator.equals(
    "activeRiskCases KPI should be zero in idle system",
    stats.kpis.activeRiskCases,
    0,
  );

  // 3-5. actionsByType: either empty or only zero-count buckets
  for (const bucket of stats.actionsByType) {
    TestValidator.equals(
      "each actionsByType bucket count should be zero in idle system",
      bucket.count,
      0,
    );
    if (bucket.percentage !== undefined) {
      TestValidator.predicate(
        "bucket.percentage, when present, must be between 0 and 100",
        bucket.percentage >= 0 && bucket.percentage <= 100,
      );
    }
  }

  // 3-6. actionsPerDay: either empty or only zero-count daily points
  for (const point of stats.actionsPerDay) {
    TestValidator.equals(
      "each actionsPerDay count should be zero in idle system",
      point.count,
      0,
    );
  }
}
