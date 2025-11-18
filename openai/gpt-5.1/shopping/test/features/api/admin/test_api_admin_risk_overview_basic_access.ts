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
 * Basic access test for admin risk overview dashboard.
 *
 * This test verifies that a freshly registered administrator can successfully
 * access the aggregated risk overview dashboard and that the response is a
 * well-formed `IShoppingMallAdminRiskOverview` snapshot containing only
 * aggregated, non-PII metrics.
 *
 * High-level steps:
 *
 * 1. Join as a new admin using `POST /auth/admin/join`, which also returns an
 *    `IShoppingMallAdmin.IAuthorized` payload and configures the connection
 *    with the admin access token via the SDK.
 * 2. Using the same `connection` (now authenticated as admin), call `GET
 *    /shoppingMall/admin/adminDashboard/riskOverview` through
 *    `api.functional.shoppingMall.admin.adminDashboard.riskOverview.at`.
 * 3. Assert the response matches `IShoppingMallAdminRiskOverview` via
 *    `typia.assert`.
 * 4. Perform business-level validations:
 *
 *    - All primary stats segments (`riskCaseStats`, `riskRuleStats`,
 *         `refundAndDisputeRiskStats`, `actorAnomalyStats`) exist and are
 *         non-null objects.
 *    - `campaignRiskStats` is either undefined or a non-null object.
 *    - `generatedAt` is a non-empty string (date-time format already enforced by
 *         `typia.assert`).
 *    - All integer counters in stats summaries are numeric and non-negative.
 *    - Refund/dispute spike flags are boolean values.
 *    - The overview payload itself does not expose token or admin identity
 *         information and contains no obvious PII fields like `email` or `id`
 *         on the root object.
 */
export async function test_api_admin_risk_overview_basic_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin; SDK will wire Authorization header automatically.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Leave ip as undefined to let backend/session logic derive IP if needed.
    href: "https://admin-portal.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin-portal.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call the admin risk overview dashboard using the authenticated context.
  const overview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overview);

  // 3. Basic presence and non-null checks of core segments.
  TestValidator.predicate(
    "riskCaseStats segment should be present",
    overview.riskCaseStats !== null && overview.riskCaseStats !== undefined,
  );
  TestValidator.predicate(
    "riskRuleStats segment should be present",
    overview.riskRuleStats !== null && overview.riskRuleStats !== undefined,
  );
  TestValidator.predicate(
    "refundAndDisputeRiskStats segment should be present",
    overview.refundAndDisputeRiskStats !== null &&
      overview.refundAndDisputeRiskStats !== undefined,
  );
  TestValidator.predicate(
    "actorAnomalyStats segment should be present",
    overview.actorAnomalyStats !== null &&
      overview.actorAnomalyStats !== undefined,
  );
  TestValidator.predicate(
    "generatedAt should be a non-empty string",
    typeof overview.generatedAt === "string" && overview.generatedAt.length > 0,
  );

  // 4. If campaignRiskStats is present, ensure it is non-null.
  if (overview.campaignRiskStats !== undefined) {
    TestValidator.predicate(
      "campaignRiskStats, when present, should be non-null",
      overview.campaignRiskStats !== null,
    );
  }

  // 5. Validate numeric counters in IShoppingMallRiskCaseStatsSummary.
  const riskCaseStats: IShoppingMallRiskCaseStatsSummary =
    overview.riskCaseStats;
  TestValidator.predicate(
    "openCaseCount should be a non-negative integer",
    typeof riskCaseStats.openCaseCount === "number" &&
      riskCaseStats.openCaseCount >= 0,
  );
  TestValidator.predicate(
    "recentlyClosedCaseCount should be a non-negative integer",
    typeof riskCaseStats.recentlyClosedCaseCount === "number" &&
      riskCaseStats.recentlyClosedCaseCount >= 0,
  );
  TestValidator.predicate(
    "highSeverityOpenCaseCount should be a non-negative integer",
    typeof riskCaseStats.highSeverityOpenCaseCount === "number" &&
      riskCaseStats.highSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "mediumSeverityOpenCaseCount should be a non-negative integer",
    typeof riskCaseStats.mediumSeverityOpenCaseCount === "number" &&
      riskCaseStats.mediumSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "lowSeverityOpenCaseCount should be a non-negative integer",
    typeof riskCaseStats.lowSeverityOpenCaseCount === "number" &&
      riskCaseStats.lowSeverityOpenCaseCount >= 0,
  );

  // 6. Validate numeric counters and flags in IShoppingMallRiskRuleStatsSummary.
  const riskRuleStats: IShoppingMallRiskRuleStatsSummary =
    overview.riskRuleStats;
  TestValidator.predicate(
    "totalRiskRuleCount should be a non-negative integer",
    typeof riskRuleStats.totalRiskRuleCount === "number" &&
      riskRuleStats.totalRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "activeRiskRuleCount should be a non-negative integer",
    typeof riskRuleStats.activeRiskRuleCount === "number" &&
      riskRuleStats.activeRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "disabledRiskRuleCount should be a non-negative integer",
    typeof riskRuleStats.disabledRiskRuleCount === "number" &&
      riskRuleStats.disabledRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "policyOverrideCount should be a non-negative integer",
    typeof riskRuleStats.policyOverrideCount === "number" &&
      riskRuleStats.policyOverrideCount >= 0,
  );

  // 7. Validate refund/dispute rate stats and spike flags.
  const refundStats: IShoppingMallRefundAndDisputeRiskStatsSummary =
    overview.refundAndDisputeRiskStats;
  TestValidator.predicate(
    "recentRefundRate should be a finite number",
    typeof refundStats.recentRefundRate === "number" &&
      Number.isFinite(refundStats.recentRefundRate),
  );
  TestValidator.predicate(
    "recentDisputeRate should be a finite number",
    typeof refundStats.recentDisputeRate === "number" &&
      Number.isFinite(refundStats.recentDisputeRate),
  );
  TestValidator.predicate(
    "chargebackRate should be a finite number",
    typeof refundStats.chargebackRate === "number" &&
      Number.isFinite(refundStats.chargebackRate),
  );
  TestValidator.predicate(
    "recentRefundSpikeFlag should be boolean",
    typeof refundStats.recentRefundSpikeFlag === "boolean",
  );
  TestValidator.predicate(
    "recentDisputeSpikeFlag should be boolean",
    typeof refundStats.recentDisputeSpikeFlag === "boolean",
  );

  // 8. Validate actor anomaly counters.
  const actorStats: IShoppingMallActorAnomalyStatsSummary =
    overview.actorAnomalyStats;
  TestValidator.predicate(
    "anomalousCustomerCount should be a non-negative integer",
    typeof actorStats.anomalousCustomerCount === "number" &&
      actorStats.anomalousCustomerCount >= 0,
  );
  TestValidator.predicate(
    "anomalousSellerCount should be a non-negative integer",
    typeof actorStats.anomalousSellerCount === "number" &&
      actorStats.anomalousSellerCount >= 0,
  );
  TestValidator.predicate(
    "newHighRiskCustomerCount should be a non-negative integer",
    typeof actorStats.newHighRiskCustomerCount === "number" &&
      actorStats.newHighRiskCustomerCount >= 0,
  );
  TestValidator.predicate(
    "newHighRiskSellerCount should be a non-negative integer",
    typeof actorStats.newHighRiskSellerCount === "number" &&
      actorStats.newHighRiskSellerCount >= 0,
  );

  // 9. If campaignRiskStats exists, ensure its counters are sane and non-negative.
  if (
    overview.campaignRiskStats !== undefined &&
    overview.campaignRiskStats !== null
  ) {
    const campaignStats: IShoppingMallCampaignRiskStatsSummary =
      overview.campaignRiskStats;
    TestValidator.predicate(
      "activeCampaignCount should be a non-negative integer",
      typeof campaignStats.activeCampaignCount === "number" &&
        campaignStats.activeCampaignCount >= 0,
    );
    TestValidator.predicate(
      "campaignsWithElevatedRefundRateCount should be a non-negative integer",
      typeof campaignStats.campaignsWithElevatedRefundRateCount === "number" &&
        campaignStats.campaignsWithElevatedRefundRateCount >= 0,
    );
    TestValidator.predicate(
      "campaignsWithElevatedDisputeRateCount should be a non-negative integer",
      typeof campaignStats.campaignsWithElevatedDisputeRateCount === "number" &&
        campaignStats.campaignsWithElevatedDisputeRateCount >= 0,
    );
  }

  // 10. Sanity check that the overview payload itself is aggregate-only and
  // does not contain obvious PII or token fields on the root object.
  const overviewKeys = Object.keys(overview);
  TestValidator.predicate(
    "overview root should not expose obvious PII fields like email or id",
    !overviewKeys.includes("email") && !overviewKeys.includes("id"),
  );
}
