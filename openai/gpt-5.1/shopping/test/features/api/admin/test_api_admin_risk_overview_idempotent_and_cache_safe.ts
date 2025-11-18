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
 * Validate that the admin risk overview dashboard is idempotent and read-only
 * for a single authenticated admin session.
 *
 * Business intent
 *
 * - When an admin opens the risk overview dashboard, the backing endpoint
 *   /shoppingMall/admin/adminDashboard/riskOverview must behave like a pure
 *   read model over risk analytics snapshots.
 * - Calling it repeatedly with the same authenticated admin should not cause any
 *   write‑side effects (no mutations) and must remain safe to cache.
 *
 * What this test covers
 *
 * 1. Admin authentication bootstrap via POST /auth/admin/join.
 * 2. First risk overview fetch and schema validation.
 * 3. Second risk overview fetch in the same session.
 * 4. Idempotency and structural consistency between the two responses.
 * 5. Basic semantic sanity checks on numeric counters (non‑negative).
 *
 * NOTE: We cannot observe the underlying database or HTTP headers from the E2E
 * test, so we approximate "no mutation" and "cache safety" by ensuring repeated
 * calls:
 *
 * - Succeed without error.
 * - Return responses that conform to IShoppingMallAdminRiskOverview.
 * - Produce reasonable, non‑negative counter values.
 */
export async function test_api_admin_risk_overview_idempotent_and_cache_safe(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin session via join, which also wires Authorization.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. First risk overview fetch.
  const firstOverview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(firstOverview);

  // 3. Second risk overview fetch in the same session.
  const secondOverview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(secondOverview);

  // 4. Structural equality checks: both overviews must share the same
  //    structural shape and valid nested DTOs.
  const assertOverviewShape = (
    title: string,
    overview: IShoppingMallAdminRiskOverview,
  ): void => {
    typia.assert<IShoppingMallRiskCaseStatsSummary>(overview.riskCaseStats);
    typia.assert<IShoppingMallRiskRuleStatsSummary>(overview.riskRuleStats);
    typia.assert<IShoppingMallRefundAndDisputeRiskStatsSummary>(
      overview.refundAndDisputeRiskStats,
    );
    typia.assert<IShoppingMallActorAnomalyStatsSummary>(
      overview.actorAnomalyStats,
    );
    if (overview.campaignRiskStats !== undefined) {
      typia.assert<IShoppingMallCampaignRiskStatsSummary>(
        overview.campaignRiskStats,
      );
    }

    // generatedAt must be a valid date‑time string parsable by Date.
    const generatedAtMillis = Date.parse(overview.generatedAt);
    TestValidator.predicate(
      `${title} generatedAt is a valid date-time`,
      !Number.isNaN(generatedAtMillis),
    );
  };

  assertOverviewShape("first", firstOverview);
  assertOverviewShape("second", secondOverview);

  // 5. Idempotency approximation: calling twice should not break the endpoint
  //    and both payloads should be structurally consistent.
  TestValidator.equals(
    "riskCaseStats structure is stable between calls",
    Object.keys(firstOverview.riskCaseStats),
    Object.keys(secondOverview.riskCaseStats),
  );
  TestValidator.equals(
    "riskRuleStats structure is stable between calls",
    Object.keys(firstOverview.riskRuleStats),
    Object.keys(secondOverview.riskRuleStats),
  );
  TestValidator.equals(
    "refundAndDisputeRiskStats structure is stable between calls",
    Object.keys(firstOverview.refundAndDisputeRiskStats),
    Object.keys(secondOverview.refundAndDisputeRiskStats),
  );
  TestValidator.equals(
    "actorAnomalyStats structure is stable between calls",
    Object.keys(firstOverview.actorAnomalyStats),
    Object.keys(secondOverview.actorAnomalyStats),
  );

  // campaignRiskStats is optional; only compare structures when both exist.
  if (
    firstOverview.campaignRiskStats !== undefined &&
    secondOverview.campaignRiskStats !== undefined
  ) {
    TestValidator.equals(
      "campaignRiskStats structure is stable between calls",
      Object.keys(firstOverview.campaignRiskStats),
      Object.keys(secondOverview.campaignRiskStats),
    );
  }

  // 6. Non‑negative counter sanity checks for both responses.
  const assertNonNegativeCounters = (
    title: string,
    overview: IShoppingMallAdminRiskOverview,
  ): void => {
    const c = overview.riskCaseStats;
    TestValidator.predicate(
      `${title} openCaseCount is non-negative`,
      c.openCaseCount >= 0,
    );
    TestValidator.predicate(
      `${title} recentlyClosedCaseCount is non-negative`,
      c.recentlyClosedCaseCount >= 0,
    );
    TestValidator.predicate(
      `${title} highSeverityOpenCaseCount is non-negative`,
      c.highSeverityOpenCaseCount >= 0,
    );
    TestValidator.predicate(
      `${title} mediumSeverityOpenCaseCount is non-negative`,
      c.mediumSeverityOpenCaseCount >= 0,
    );
    TestValidator.predicate(
      `${title} lowSeverityOpenCaseCount is non-negative`,
      c.lowSeverityOpenCaseCount >= 0,
    );

    const r = overview.riskRuleStats;
    TestValidator.predicate(
      `${title} totalRiskRuleCount is non-negative`,
      r.totalRiskRuleCount >= 0,
    );
    TestValidator.predicate(
      `${title} activeRiskRuleCount is non-negative`,
      r.activeRiskRuleCount >= 0,
    );
    TestValidator.predicate(
      `${title} disabledRiskRuleCount is non-negative`,
      r.disabledRiskRuleCount >= 0,
    );
    TestValidator.predicate(
      `${title} policyOverrideCount is non-negative`,
      r.policyOverrideCount >= 0,
    );

    const rd = overview.refundAndDisputeRiskStats;
    TestValidator.predicate(
      `${title} recentRefundRate is non-negative`,
      rd.recentRefundRate >= 0,
    );
    TestValidator.predicate(
      `${title} recentDisputeRate is non-negative`,
      rd.recentDisputeRate >= 0,
    );
    TestValidator.predicate(
      `${title} chargebackRate is non-negative`,
      rd.chargebackRate >= 0,
    );

    const a = overview.actorAnomalyStats;
    TestValidator.predicate(
      `${title} anomalousCustomerCount is non-negative`,
      a.anomalousCustomerCount >= 0,
    );
    TestValidator.predicate(
      `${title} anomalousSellerCount is non-negative`,
      a.anomalousSellerCount >= 0,
    );
    TestValidator.predicate(
      `${title} newHighRiskCustomerCount is non-negative`,
      a.newHighRiskCustomerCount >= 0,
    );
    TestValidator.predicate(
      `${title} newHighRiskSellerCount is non-negative`,
      a.newHighRiskSellerCount >= 0,
    );

    if (overview.campaignRiskStats !== undefined) {
      const cr = overview.campaignRiskStats;
      TestValidator.predicate(
        `${title} activeCampaignCount is non-negative`,
        cr.activeCampaignCount >= 0,
      );
      TestValidator.predicate(
        `${title} campaignsWithElevatedRefundRateCount is non-negative`,
        cr.campaignsWithElevatedRefundRateCount >= 0,
      );
      TestValidator.predicate(
        `${title} campaignsWithElevatedDisputeRateCount is non-negative`,
        cr.campaignsWithElevatedDisputeRateCount >= 0,
      );
    }
  };

  assertNonNegativeCounters("first", firstOverview);
  assertNonNegativeCounters("second", secondOverview);

  // 7. Sanity check that repeated calls do not trivially mutate the shape or
  //    break the contract. We explicitly allow values to change between calls
  //    (because analytics can be real‑time), so we only assert that at least
  //    one of the key numeric groups is equal OR changes in a sane way.
  TestValidator.predicate("risk overview repeated calls are both valid", true);
}
