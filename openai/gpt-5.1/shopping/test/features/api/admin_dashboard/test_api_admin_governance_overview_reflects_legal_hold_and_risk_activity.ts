import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatsSummary";
import type { IShoppingMallAdminGovernanceOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminGovernanceOverview";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatsSummary";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";
import type { IShoppingMallOrderDailyStatPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStatPoint";
import type { IShoppingMallOrderStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatsSummary";
import type { IShoppingMallPlatformKpisSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpisSummary";
import type { IShoppingMallRefundAndDisputeStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStatsSummary";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseEvent";

/**
 * Validate that the admin governance overview reflects recent legal hold and
 * risk activity performed by an authenticated admin.
 *
 * Business purpose:
 *
 * - Ensure that when an administrator creates legal holds, attaches targets, and
 *   records risk case activity, the aggregated governance overview snapshot
 *   includes non-trivial legalHoldStats and adminActivityStats.
 * - Validate that legalHoldStats.affectedEntityCount and
 *   legalHoldStats.activeLegalHoldCount become positive after we create at
 *   least one active legal hold with attached targets.
 * - Validate that adminActivityStats indicates at least one admin and some recent
 *   audit-like activity after performing governance operations.
 * - Sanity-check that the overview structure is complete and internally type-safe
 *   via typia.
 *
 * Test steps:
 *
 * 1. Join as a new admin via POST /auth/admin/join, letting the SDK attach the
 *    token to the shared connection.
 * 2. Create multiple legal holds via POST /shoppingMall/admin/legalHolds using
 *    IShoppingMallLegalHold.ICreate payloads with unique codes.
 * 3. For at least one legal hold, create multiple targets via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with
 *    IShoppingMallLegalHoldTarget.ICreate, using random UUIDs for target_id.
 * 4. Create one or more risk cases via POST /shoppingMall/admin/riskCases with
 *    IShoppingMallRiskCase.ICreate, setting meaningful status and severity
 *    strings.
 * 5. For each risk case, create at least one risk case event via POST
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events to simulate active
 *    risk and governance operations.
 * 6. Call GET /shoppingMall/admin/adminDashboard/governanceOverview.
 * 7. Assert via typia.assert that the response conforms to
 *    IShoppingMallAdminGovernanceOverview (which in turn asserts nested DTOs
 *    like platformKpis, orderStats, refundAndDisputeStats, legalHoldStats, and
 *    adminActivityStats).
 * 8. Use TestValidator.predicate and TestValidator.equals to make high-level,
 *    monotonic assertions:
 *
 *    - LegalHoldStats.activeLegalHoldCount >= 1
 *    - LegalHoldStats.affectedEntityCount >= distinctTargetsCreated
 *    - AdminActivityStats.totalAdminCount >= 1
 *    - AdminActivityStats.activeAdminCount >= 1
 *    - AdminActivityStats.recentAuditEventCount >= 1 (best-effort sanity check that
 *         activity has been recorded).
 *
 * The test is tolerant of additional background data in the environment
 * (pre-existing legal holds, admins, or audit logs) and only enforces that
 * metrics are at least as large as the footprint created in this test, not
 * exact equality.
 */
export async function test_api_admin_governance_overview_reflects_legal_hold_and_risk_activity(
  connection: api.IConnection,
) {
  // 1. Join as admin; SDK will set Authorization header on connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a couple of legal holds.
  const legalHoldCount = 2;
  const createdLegalHolds: IShoppingMallLegalHold[] =
    await ArrayUtil.asyncRepeat(legalHoldCount, async (index) => {
      const code = `E2E-LEGAL-HOLD-${Date.now()}-${index}-${RandomGenerator.alphaNumeric(6)}`;
      const body = {
        code,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        status: "active",
        scope_description: RandomGenerator.paragraph({ sentences: 5 }),
        external_reference: `CASE-${RandomGenerator.alphaNumeric(10)}`,
        effective_from: new Date().toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallLegalHold.ICreate;

      const hold: IShoppingMallLegalHold =
        await api.functional.shoppingMall.admin.legalHolds.create(connection, {
          body,
        });
      typia.assert<IShoppingMallLegalHold>(hold);
      TestValidator.equals(
        "created legal hold code should match request",
        hold.code,
        code,
      );
      return hold;
    });

  // 3. Attach multiple targets to the first legal hold.
  const primaryHold = createdLegalHolds[0];
  const targetCount = 3;
  const createdTargets: IShoppingMallLegalHoldTarget[] =
    await ArrayUtil.asyncRepeat(targetCount, async (index) => {
      const targetBody = {
        target_type: RandomGenerator.pick([
          "customer",
          "seller",
          "order",
          "dispute",
        ] as const),
        target_id: typia.random<string & tags.Format<"uuid">>(),
        target_display: RandomGenerator.paragraph({ sentences: 2 }),
        note: `E2E target #${index + 1} for legal hold ${primaryHold.code}`,
      } satisfies IShoppingMallLegalHoldTarget.ICreate;

      const target: IShoppingMallLegalHoldTarget =
        await api.functional.shoppingMall.admin.legalHolds.targets.create(
          connection,
          {
            legalHoldCode: primaryHold.code,
            body: targetBody,
          },
        );
      typia.assert<IShoppingMallLegalHoldTarget>(target);
      return target;
    });

  // 4. Create one or more risk cases.
  const riskCaseCount = 2;
  const createdRiskCases: IShoppingMallRiskCase[] = await ArrayUtil.asyncRepeat(
    riskCaseCount,
    async (index) => {
      const caseCode = `E2E-RISK-${Date.now()}-${index}-${RandomGenerator.alphaNumeric(6)}`;
      const riskBody = {
        case_code: caseCode,
        title: `E2E risk case #${index + 1}`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        status: index === 0 ? "open" : "under_review",
        severity: index === 0 ? "high" : "medium",
        primary_subject_type: "order",
        primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
        primary_subject_display: `Order-${RandomGenerator.alphaNumeric(8)}`,
        sla_due_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString() as string & tags.Format<"date-time">,
      } satisfies IShoppingMallRiskCase.ICreate;

      const riskCase: IShoppingMallRiskCase =
        await api.functional.shoppingMall.admin.riskCases.create(connection, {
          body: riskBody,
        });
      typia.assert<IShoppingMallRiskCase>(riskCase);
      TestValidator.equals(
        "created risk case code should match request",
        riskCase.case_code,
        caseCode,
      );
      return riskCase;
    },
  );

  // 5. Append at least one event to each risk case.
  const createdEvents: IShoppingMallRiskCaseEvent[] = [];
  for (const riskCase of createdRiskCases) {
    const eventBody = {
      event_type: "status_changed",
      from_status: riskCase.status,
      to_status: riskCase.status,
      description: `E2E risk case event for ${riskCase.case_code}`,
      related_entity_type: riskCase.primary_subject_type ?? null,
      related_entity_id: riskCase.primary_subject_id ?? null,
    } satisfies IShoppingMallRiskCaseEvent.ICreate;

    const event: IShoppingMallRiskCaseEvent =
      await api.functional.shoppingMall.admin.riskCases.events.create(
        connection,
        {
          riskCaseCode: riskCase.case_code,
          body: eventBody,
        },
      );
    typia.assert<IShoppingMallRiskCaseEvent>(event);
    createdEvents.push(event);
  }

  // 6. Fetch governance overview.
  const overview: IShoppingMallAdminGovernanceOverview =
    await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminGovernanceOverview>(overview);

  // 7. High-level assertions on structure and monotonic metrics.
  const platformKpis: IShoppingMallPlatformKpisSummary = overview.platformKpis;
  const orderStats: IShoppingMallOrderStatsSummary = overview.orderStats;
  const refundStats: IShoppingMallRefundAndDisputeStatsSummary =
    overview.refundAndDisputeStats;
  const legalHoldStats: IShoppingMallLegalHoldStatsSummary =
    overview.legalHoldStats;
  const adminActivityStats: IShoppingMallAdminActivityStatsSummary =
    overview.adminActivityStats;

  typia.assert<IShoppingMallPlatformKpisSummary>(platformKpis);
  typia.assert<IShoppingMallOrderStatsSummary>(orderStats);
  typia.assert<IShoppingMallRefundAndDisputeStatsSummary>(refundStats);
  typia.assert<IShoppingMallLegalHoldStatsSummary>(legalHoldStats);
  typia.assert<IShoppingMallAdminActivityStatsSummary>(adminActivityStats);

  // Legal hold expectations.
  TestValidator.predicate(
    "legalHoldStats.activeLegalHoldCount should be >= 1",
    legalHoldStats.activeLegalHoldCount >= 1,
  );

  TestValidator.predicate(
    "legalHoldStats.affectedEntityCount should cover our created targets",
    legalHoldStats.affectedEntityCount >= createdTargets.length,
  );

  // Admin activity expectations.
  TestValidator.predicate(
    "adminActivityStats.totalAdminCount should be >= 1",
    adminActivityStats.totalAdminCount >= 1,
  );

  TestValidator.predicate(
    "adminActivityStats.activeAdminCount should be >= 1",
    adminActivityStats.activeAdminCount >= 1,
  );

  TestValidator.predicate(
    "adminActivityStats.recentAuditEventCount should be >= 1",
    adminActivityStats.recentAuditEventCount >= 1,
  );

  // Basic sanity checks on platform KPIs and order/refund stats being non-negative.
  TestValidator.predicate(
    "platformKpis.activeCustomerCount should be non-negative",
    platformKpis.activeCustomerCount >= 0,
  );
  TestValidator.predicate(
    "platformKpis.activeSellerCount should be non-negative",
    platformKpis.activeSellerCount >= 0,
  );
  TestValidator.predicate(
    "platformKpis.orderCount should be non-negative",
    platformKpis.orderCount >= 0,
  );
  TestValidator.predicate(
    "platformKpis.grossMerchandiseVolume should be non-negative",
    platformKpis.grossMerchandiseVolume >= 0,
  );

  TestValidator.predicate(
    "orderStats.totalOrders should be non-negative",
    orderStats.totalOrders >= 0,
  );
  TestValidator.predicate(
    "orderStats.totalRevenue should be non-negative",
    orderStats.totalRevenue >= 0,
  );

  TestValidator.predicate(
    "refundAndDisputeStats.totalRefundCount should be non-negative",
    refundStats.totalRefundCount >= 0,
  );
  TestValidator.predicate(
    "refundAndDisputeStats.totalDisputeCount should be non-negative",
    refundStats.totalDisputeCount >= 0,
  );
}
