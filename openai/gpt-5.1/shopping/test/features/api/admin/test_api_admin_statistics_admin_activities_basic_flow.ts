import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatistics";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate that admin activity statistics reflect recent governance actions.
 *
 * Business goal: Ensure that when a freshly registered administrator performs
 * at least one governance-related action (creating an admin notification), the
 * aggregated statistics endpoint
 * `/shoppingMall/admin/statistics/adminActivities` returns consistent,
 * non-negative metrics with totals and buckets that indicate recorded activity
 * for at least one admin and at least one action type and day.
 *
 * Flow:
 *
 * 1. Register a new admin via POST /auth/admin/join and ensure the authorization
 *    payload is structurally valid.
 * 2. Using the authenticated admin context, create a single admin notification via
 *    POST /shoppingMall/admin/adminNotifications targeting that admin.
 * 3. Call GET /shoppingMall/admin/statistics/adminActivities to retrieve
 *    aggregated admin activity statistics.
 * 4. Validate that:
 *
 *    - TotalActions >= 1
 *    - UniqueAdminsActive >= 1
 *    - ActionsByType has at least one bucket with count >= 1
 *    - ActionsPerDay has at least one point with count >= 1
 *    - KPI counters are present and non-negative integers.
 */
export async function test_api_admin_statistics_admin_activities_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a governance-related admin notification for this admin
  const notificationBody = {
    shopping_mall_admin_id: authorizedAdmin.id,
    related_risk_case_id: undefined,
    related_legal_hold_id: undefined,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    status: "unread",
    priority: "high",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(createdNotification);

  // 3. Retrieve aggregated admin activity statistics
  const stats: IShoppingMallAdminActivityStatistics =
    await api.functional.shoppingMall.admin.statistics.adminActivities.index(
      connection,
    );
  typia.assert<IShoppingMallAdminActivityStatistics>(stats);

  // 4. Business logic validations
  // 4.1 Total actions and active admins should be at least 1
  TestValidator.predicate(
    "totalActions must be at least 1 when an admin has just acted",
    stats.totalActions >= 1,
  );

  TestValidator.predicate(
    "uniqueAdminsActive must be at least 1 when one admin has acted",
    stats.uniqueAdminsActive >= 1,
  );

  // 4.2 At least one action type bucket has positive count
  const hasActionBucketWithCount = stats.actionsByType.some(
    (bucket) => bucket.count >= 1,
  );
  TestValidator.predicate(
    "actionsByType should contain at least one bucket with count >= 1",
    hasActionBucketWithCount,
  );

  // 4.3 actionsPerDay should contain at least one day with positive count
  const hasDayWithActions = stats.actionsPerDay.some(
    (point) => point.count >= 1,
  );
  TestValidator.predicate(
    "actionsPerDay should have at least one point with count >= 1",
    hasDayWithActions,
  );

  // 4.4 KPI counters must be non-negative integers (already enforced by type tags,
  //     but we assert business expectations explicitly as predicates)
  TestValidator.predicate(
    "kpis.ordersProcessed must be non-negative",
    stats.kpis.ordersProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.refundsProcessed must be non-negative",
    stats.kpis.refundsProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.disputesClosed must be non-negative",
    stats.kpis.disputesClosed >= 0,
  );
  TestValidator.predicate(
    "kpis.activeRiskCases must be non-negative",
    stats.kpis.activeRiskCases >= 0,
  );
}
