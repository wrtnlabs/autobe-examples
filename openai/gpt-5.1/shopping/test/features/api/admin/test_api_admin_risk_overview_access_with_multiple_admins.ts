import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorAnomalyStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorAnomalyStatsSummary";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRiskOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRiskOverview";
import type { IShoppingMallCampaignRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignRiskStatsSummary";
import type { IShoppingMallRefundAndDisputeRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeRiskStatsSummary";
import type { IShoppingMallRiskCaseStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatsSummary";
import type { IShoppingMallRiskRuleStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatsSummary";

/**
 * Verify that the admin risk overview dashboard is accessible from multiple
 * independent admin accounts and that it exposes only platform-level aggregated
 * risk metrics, not admin-specific sensitive data.
 *
 * Business flow:
 *
 * 1. Join as admin A using POST /auth/admin/join. The SDK stores admin A's access
 *    token into the shared connection.
 * 2. While authenticated as admin A, call GET
 *    /shoppingMall/admin/adminDashboard/riskOverview and capture the
 *    IShoppingMallAdminRiskOverview snapshot.
 * 3. Join again as admin B with a different email using POST /auth/admin/join. The
 *    SDK overwrites the Authorization header in the same connection so it now
 *    represents admin B.
 * 4. As admin B, call the same risk overview endpoint and capture the second
 *    snapshot.
 * 5. Assert that both snapshots are structurally valid, contain non‑negative
 *    counts for all integer metrics, and do not expose any admin credential
 *    data (the DTO type itself is risk-dashboard only).
 * 6. Optionally compare some counters between the two snapshots to illustrate that
 *    they describe global platform risk state (often equal in tests), but do
 *    not require strict equality – only structural validity and sensible ranges
 *    are enforced.
 */
export async function test_api_admin_risk_overview_access_with_multiple_admins(
  connection: api.IConnection,
) {
  // 1. Create admin A via /auth/admin/join
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAJoinBody = {
    email: adminAEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);
  typia.assert<IAuthorizationToken>(adminA.token);

  // 2. Admin A calls risk overview endpoint
  const overviewA: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overviewA);

  // 3. Create admin B via /auth/admin/join with a different email
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminBJoinBody = {
    email: adminBEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);
  typia.assert<IAuthorizationToken>(adminB.token);

  // 4. Admin B calls risk overview endpoint
  const overviewB: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overviewB);

  // 5. Basic structural and range validations for overview A
  const caseA: IShoppingMallRiskCaseStatsSummary = overviewA.riskCaseStats;
  const ruleA: IShoppingMallRiskRuleStatsSummary = overviewA.riskRuleStats;
  const refundA: IShoppingMallRefundAndDisputeRiskStatsSummary =
    overviewA.refundAndDisputeRiskStats;
  const actorA: IShoppingMallActorAnomalyStatsSummary =
    overviewA.actorAnomalyStats;
  const campaignA: IShoppingMallCampaignRiskStatsSummary | undefined =
    overviewA.campaignRiskStats;

  TestValidator.predicate(
    "riskCaseStats counts for admin A are non-negative",
    () =>
      caseA.openCaseCount >= 0 &&
      caseA.recentlyClosedCaseCount >= 0 &&
      caseA.highSeverityOpenCaseCount >= 0 &&
      caseA.mediumSeverityOpenCaseCount >= 0 &&
      caseA.lowSeverityOpenCaseCount >= 0,
  );

  TestValidator.predicate(
    "riskRuleStats counts for admin A are non-negative",
    () =>
      ruleA.totalRiskRuleCount >= 0 &&
      ruleA.activeRiskRuleCount >= 0 &&
      ruleA.disabledRiskRuleCount >= 0 &&
      ruleA.policyOverrideCount >= 0,
  );

  TestValidator.predicate(
    "refund/dispute rates for admin A are finite numbers",
    () =>
      Number.isFinite(refundA.recentRefundRate) &&
      Number.isFinite(refundA.recentDisputeRate) &&
      Number.isFinite(refundA.chargebackRate),
  );

  TestValidator.predicate(
    "actor anomaly counts for admin A are non-negative",
    () =>
      actorA.anomalousCustomerCount >= 0 &&
      actorA.anomalousSellerCount >= 0 &&
      actorA.newHighRiskCustomerCount >= 0 &&
      actorA.newHighRiskSellerCount >= 0,
  );

  if (campaignA !== undefined) {
    TestValidator.predicate(
      "campaign risk stats for admin A have non-negative counts",
      () =>
        campaignA.activeCampaignCount >= 0 &&
        campaignA.campaignsWithElevatedRefundRateCount >= 0 &&
        campaignA.campaignsWithElevatedDisputeRateCount >= 0,
    );
  }

  // 6. Basic structural and range validations for overview B
  const caseB: IShoppingMallRiskCaseStatsSummary = overviewB.riskCaseStats;
  const ruleB: IShoppingMallRiskRuleStatsSummary = overviewB.riskRuleStats;
  const refundB: IShoppingMallRefundAndDisputeRiskStatsSummary =
    overviewB.refundAndDisputeRiskStats;
  const actorB: IShoppingMallActorAnomalyStatsSummary =
    overviewB.actorAnomalyStats;
  const campaignB: IShoppingMallCampaignRiskStatsSummary | undefined =
    overviewB.campaignRiskStats;

  TestValidator.predicate(
    "riskCaseStats counts for admin B are non-negative",
    () =>
      caseB.openCaseCount >= 0 &&
      caseB.recentlyClosedCaseCount >= 0 &&
      caseB.highSeverityOpenCaseCount >= 0 &&
      caseB.mediumSeverityOpenCaseCount >= 0 &&
      caseB.lowSeverityOpenCaseCount >= 0,
  );

  TestValidator.predicate(
    "riskRuleStats counts for admin B are non-negative",
    () =>
      ruleB.totalRiskRuleCount >= 0 &&
      ruleB.activeRiskRuleCount >= 0 &&
      ruleB.disabledRiskRuleCount >= 0 &&
      ruleB.policyOverrideCount >= 0,
  );

  TestValidator.predicate(
    "refund/dispute rates for admin B are finite numbers",
    () =>
      Number.isFinite(refundB.recentRefundRate) &&
      Number.isFinite(refundB.recentDisputeRate) &&
      Number.isFinite(refundB.chargebackRate),
  );

  TestValidator.predicate(
    "actor anomaly counts for admin B are non-negative",
    () =>
      actorB.anomalousCustomerCount >= 0 &&
      actorB.anomalousSellerCount >= 0 &&
      actorB.newHighRiskCustomerCount >= 0 &&
      actorB.newHighRiskSellerCount >= 0,
  );

  if (campaignB !== undefined) {
    TestValidator.predicate(
      "campaign risk stats for admin B have non-negative counts",
      () =>
        campaignB.activeCampaignCount >= 0 &&
        campaignB.campaignsWithElevatedRefundRateCount >= 0 &&
        campaignB.campaignsWithElevatedDisputeRateCount >= 0,
    );
  }

  // 7. Compare a subset of counters to illustrate global (not per-admin) view.
  // In many environments these will be equal because both admins see the same
  // platform-level aggregates, but the test does not require strict equality
  // for every field.
  TestValidator.equals(
    "total risk rule count is platform-level and should not depend on admin identity",
    ruleA.totalRiskRuleCount,
    ruleB.totalRiskRuleCount,
  );

  TestValidator.equals(
    "active risk rule count is platform-level and should not depend on admin identity",
    ruleA.activeRiskRuleCount,
    ruleB.activeRiskRuleCount,
  );

  // Allow refund/dispute rates to differ, but they must both be finite numbers
  TestValidator.predicate(
    "refund/dispute rate vectors are sensible for both admins",
    () =>
      Number.isFinite(refundA.recentRefundRate) &&
      Number.isFinite(refundB.recentRefundRate) &&
      Number.isFinite(refundA.recentDisputeRate) &&
      Number.isFinite(refundB.recentDisputeRate) &&
      Number.isFinite(refundA.chargebackRate) &&
      Number.isFinite(refundB.chargebackRate),
  );
}
