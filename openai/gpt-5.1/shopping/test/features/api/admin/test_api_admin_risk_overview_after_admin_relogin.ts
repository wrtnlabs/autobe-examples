import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorAnomalyStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorAnomalyStatsSummary";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminRiskOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRiskOverview";
import type { IShoppingMallCampaignRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignRiskStatsSummary";
import type { IShoppingMallRefundAndDisputeRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeRiskStatsSummary";
import type { IShoppingMallRiskCaseStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatsSummary";
import type { IShoppingMallRiskRuleStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatsSummary";

/**
 * Validate that an admin can obtain a fresh session via re-login and still
 * retrieve the risk overview dashboard consistently.
 *
 * Business flow:
 *
 * 1. Join as a new admin (POST /auth/admin/join) and get initial tokens.
 * 2. With the join-issued token, fetch the risk overview once.
 * 3. Re-login as the same admin (POST /auth/admin/login) to obtain a new token.
 * 4. With the re-login token, fetch the risk overview again.
 * 5. Assert that both admin contexts refer to the same admin identity and that
 *    risk overview snapshots from both sessions are valid and logically
 *    consistent (non-negative counts, second snapshot not older than first).
 */
export async function test_api_admin_risk_overview_after_admin_relogin(
  connection: api.IConnection,
) {
  // 1. Register a new admin via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joined);

  // Basic identity sanity check (typia already guarantees structure)
  TestValidator.predicate("joined admin id is defined", joined.id.length > 0);

  // 2. Fetch risk overview with token issued from join
  const firstOverview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(firstOverview);

  // 3. Re-login with same credentials to obtain a fresh token
  const loginBody = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loggedIn);

  // 4. Validate that join and login refer to the same admin identity
  TestValidator.equals(
    "admin id should be same between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "admin email should be same between join and login",
    loggedIn.email,
    joined.email,
  );

  // Tokens are opaque strings; if they differ, we validate inequality, but we
  // do not require them to be different in case implementation reuses tokens.
  if (loggedIn.token.access !== joined.token.access) {
    TestValidator.notEquals(
      "access tokens from join and login should differ when implementation rotates them",
      loggedIn.token.access,
      joined.token.access,
    );
  }

  // 5. Fetch risk overview again with the new token
  const secondOverview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(secondOverview);

  // 6. Business sanity checks on riskCaseStats
  const firstRiskCases: IShoppingMallRiskCaseStatsSummary =
    firstOverview.riskCaseStats;
  const secondRiskCases: IShoppingMallRiskCaseStatsSummary =
    secondOverview.riskCaseStats;

  TestValidator.predicate(
    "openCaseCount should be non-negative in first snapshot",
    firstRiskCases.openCaseCount >= 0,
  );
  TestValidator.predicate(
    "openCaseCount should be non-negative in second snapshot",
    secondRiskCases.openCaseCount >= 0,
  );
  TestValidator.predicate(
    "highSeverityOpenCaseCount should be non-negative in second snapshot",
    secondRiskCases.highSeverityOpenCaseCount >= 0,
  );

  // 7. Business sanity checks on riskRuleStats
  const firstRiskRules: IShoppingMallRiskRuleStatsSummary =
    firstOverview.riskRuleStats;
  const secondRiskRules: IShoppingMallRiskRuleStatsSummary =
    secondOverview.riskRuleStats;

  TestValidator.predicate(
    "totalRiskRuleCount should be non-negative in first snapshot",
    firstRiskRules.totalRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "totalRiskRuleCount should be non-negative in second snapshot",
    secondRiskRules.totalRiskRuleCount >= 0,
  );

  // 8. Refund and dispute stats sanity
  const firstRefundStats: IShoppingMallRefundAndDisputeRiskStatsSummary =
    firstOverview.refundAndDisputeRiskStats;
  const secondRefundStats: IShoppingMallRefundAndDisputeRiskStatsSummary =
    secondOverview.refundAndDisputeRiskStats;

  TestValidator.predicate(
    "recentRefundRate should be non-negative in first snapshot",
    firstRefundStats.recentRefundRate >= 0,
  );
  TestValidator.predicate(
    "recentRefundRate should be non-negative in second snapshot",
    secondRefundStats.recentRefundRate >= 0,
  );

  // 9. Actor anomaly stats sanity
  const firstActorStats: IShoppingMallActorAnomalyStatsSummary =
    firstOverview.actorAnomalyStats;
  const secondActorStats: IShoppingMallActorAnomalyStatsSummary =
    secondOverview.actorAnomalyStats;

  TestValidator.predicate(
    "anomalousCustomerCount should be non-negative in first snapshot",
    firstActorStats.anomalousCustomerCount >= 0,
  );
  TestValidator.predicate(
    "anomalousCustomerCount should be non-negative in second snapshot",
    secondActorStats.anomalousCustomerCount >= 0,
  );

  // 10. generatedAt ordering sanity: second snapshot should not be older
  TestValidator.predicate(
    "second risk overview generatedAt should be same or later than first",
    new Date(secondOverview.generatedAt).getTime() >=
      new Date(firstOverview.generatedAt).getTime(),
  );
}
