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

export async function test_api_admin_risk_overview_data_shape_and_non_negative_counters(
  connection: api.IConnection,
) {
  // 1. Create an admin via POST /auth/admin/join to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // optional ip: let backend derive or simulate; keep it undefined here
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  // Validate the authorization payload and token structure.
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Call the admin risk overview endpoint with the authenticated connection.
  const overview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  // Structural and type validation for the entire dashboard snapshot.
  typia.assert<IShoppingMallAdminRiskOverview>(overview);

  const riskCaseStats: IShoppingMallRiskCaseStatsSummary =
    overview.riskCaseStats;
  const riskRuleStats: IShoppingMallRiskRuleStatsSummary =
    overview.riskRuleStats;
  const refundAndDisputeRiskStats: IShoppingMallRefundAndDisputeRiskStatsSummary =
    overview.refundAndDisputeRiskStats;
  const actorAnomalyStats: IShoppingMallActorAnomalyStatsSummary =
    overview.actorAnomalyStats;
  const campaignRiskStats: IShoppingMallCampaignRiskStatsSummary | undefined =
    overview.campaignRiskStats;

  // 3.1 Validate that all risk case counters are non-negative integers.
  TestValidator.predicate(
    "openCaseCount must be non-negative",
    riskCaseStats.openCaseCount >= 0,
  );
  TestValidator.predicate(
    "recentlyClosedCaseCount must be non-negative",
    riskCaseStats.recentlyClosedCaseCount >= 0,
  );
  TestValidator.predicate(
    "highSeverityOpenCaseCount must be non-negative",
    riskCaseStats.highSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "mediumSeverityOpenCaseCount must be non-negative",
    riskCaseStats.mediumSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "lowSeverityOpenCaseCount must be non-negative",
    riskCaseStats.lowSeverityOpenCaseCount >= 0,
  );

  // 3.2 Validate risk rule stats counters and internal consistency.
  TestValidator.predicate(
    "totalRiskRuleCount must be non-negative",
    riskRuleStats.totalRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "activeRiskRuleCount must be non-negative",
    riskRuleStats.activeRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "disabledRiskRuleCount must be non-negative",
    riskRuleStats.disabledRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "policyOverrideCount must be non-negative",
    riskRuleStats.policyOverrideCount >= 0,
  );
  TestValidator.predicate(
    "active + disabled rules cannot exceed totalRiskRuleCount",
    riskRuleStats.activeRiskRuleCount + riskRuleStats.disabledRiskRuleCount <=
      riskRuleStats.totalRiskRuleCount,
  );

  // 3.3 Validate refund and dispute risk stats: rates and flags.
  TestValidator.predicate(
    "recentRefundRate must be a non-negative number",
    refundAndDisputeRiskStats.recentRefundRate >= 0 &&
      Number.isNaN(refundAndDisputeRiskStats.recentRefundRate) === false,
  );
  TestValidator.predicate(
    "recentDisputeRate must be a non-negative number",
    refundAndDisputeRiskStats.recentDisputeRate >= 0 &&
      Number.isNaN(refundAndDisputeRiskStats.recentDisputeRate) === false,
  );
  TestValidator.predicate(
    "chargebackRate must be a non-negative number",
    refundAndDisputeRiskStats.chargebackRate >= 0 &&
      Number.isNaN(refundAndDisputeRiskStats.chargebackRate) === false,
  );
  TestValidator.predicate(
    "recentRefundSpikeFlag must be boolean (business check)",
    typeof refundAndDisputeRiskStats.recentRefundSpikeFlag === "boolean",
  );
  TestValidator.predicate(
    "recentDisputeSpikeFlag must be boolean (business check)",
    typeof refundAndDisputeRiskStats.recentDisputeSpikeFlag === "boolean",
  );

  // 3.4 Validate actor anomaly stats.
  TestValidator.predicate(
    "anomalousCustomerCount must be non-negative",
    actorAnomalyStats.anomalousCustomerCount >= 0,
  );
  TestValidator.predicate(
    "anomalousSellerCount must be non-negative",
    actorAnomalyStats.anomalousSellerCount >= 0,
  );
  TestValidator.predicate(
    "newHighRiskCustomerCount must be non-negative",
    actorAnomalyStats.newHighRiskCustomerCount >= 0,
  );
  TestValidator.predicate(
    "newHighRiskSellerCount must be non-negative",
    actorAnomalyStats.newHighRiskSellerCount >= 0,
  );

  // 3.5 If campaignRiskStats is present, validate non-negative counters and bounds.
  if (campaignRiskStats !== undefined) {
    TestValidator.predicate(
      "activeCampaignCount must be non-negative",
      campaignRiskStats.activeCampaignCount >= 0,
    );
    TestValidator.predicate(
      "campaignsWithElevatedRefundRateCount must be non-negative",
      campaignRiskStats.campaignsWithElevatedRefundRateCount >= 0,
    );
    TestValidator.predicate(
      "campaignsWithElevatedDisputeRateCount must be non-negative",
      campaignRiskStats.campaignsWithElevatedDisputeRateCount >= 0,
    );
    TestValidator.predicate(
      "campaignsWithElevatedRefundRateCount cannot exceed activeCampaignCount",
      campaignRiskStats.campaignsWithElevatedRefundRateCount <=
        campaignRiskStats.activeCampaignCount,
    );
    TestValidator.predicate(
      "campaignsWithElevatedDisputeRateCount cannot exceed activeCampaignCount",
      campaignRiskStats.campaignsWithElevatedDisputeRateCount <=
        campaignRiskStats.activeCampaignCount,
    );
  }
}
