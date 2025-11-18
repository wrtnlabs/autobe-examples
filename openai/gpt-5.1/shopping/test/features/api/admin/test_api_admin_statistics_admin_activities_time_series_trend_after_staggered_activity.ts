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
 * Validate that admin activity statistics reflect recent admin actions and
 * expose a consistent time-series view.
 *
 * ## Business context
 *
 * The shopping mall platform exposes an aggregated admin activity dashboard via
 * GET /shoppingMall/admin/statistics/adminActivities. This endpoint returns
 * total action counts, per-type breakdowns, daily time-series data, and KPI
 * summaries derived from internal audit and snapshot tables.
 *
 * In this test we:
 *
 * 1. Join a new admin account so that we have an authenticated admin actor.
 * 2. Under that admin context, create several admin notifications which represent
 *    concrete admin actions.
 * 3. Fetch the aggregated admin activity statistics.
 * 4. Validate that the statistics structure is sound and that key invariants hold
 *    in relation to the actions we have just performed.
 *
 * Due to the lack of clock control or backdated creation in the available DTOs,
 * we cannot reliably force notifications onto multiple separate calendar dates;
 * therefore, we only assert conservative relationships (lower bounds and
 * non-emptiness) rather than exact date buckets.
 *
 * ## Step-by-step process
 *
 * 1. Call POST /auth/admin/join with a randomly generated
 *    IShoppingMallAdminJoin.ICreate payload to create a new admin.
 *
 *    - The SDK automatically stores the admin access token into the shared
 *         connection headers.
 *    - We assert the IShoppingMallAdmin.IAuthorized response.
 * 2. Using the authenticated connection, create N (e.g., 5) admin notifications
 *    via POST /shoppingMall/admin/adminNotifications.
 *
 *    - For each notification we:
 *
 *         - Set shopping_mall_admin_id to the joined admin’s id.
 *         - Fill required fields (type, title, status).
 *         - Optionally vary body, priority, entity_type, etc. using RandomGenerator /
 *                   typia.random to resemble realistic data.
 *    - We assert each IShoppingMallAdminNotification response.
 * 3. Call GET /shoppingMall/admin/statistics/adminActivities to retrieve
 *    IShoppingMallAdminActivityStatistics.
 *
 *    - Assert the response structure with typia.assert.
 * 4. Validate business invariants using TestValidator:
 *
 *    - TotalActions is a non-negative int32 and
 *
 * > = notificationsCreated (since our actions can only increase overall counts).
 *
 * - UniqueAdminsActive is >= 1 because at least our joined admin has acted.
 * - ActionsPerDay is a non-empty array; for each point, `count` is non-negative.
 * - Sum of `count` over actionsPerDay is >= notificationsCreated.
 * - ActionsByType has at least one bucket and each bucket’s `count` is
 *   non-negative.
 * - KPI fields in `kpis` (ordersProcessed, refundsProcessed, disputesClosed,
 *   activeRiskCases) are all non-negative.
 *
 * We explicitly avoid testing type-mismatch or HTTP error scenarios; the intent
 * is to verify that the statistics endpoint behaves sensibly when fed with a
 * small but realistic stream of admin actions.
 */
export async function test_api_admin_statistics_admin_activities_time_series_trend_after_staggered_activity(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a small batch of admin notifications as concrete actions
  const notificationsToCreate = 5;
  const createdNotifications: IShoppingMallAdminNotification[] = [];

  for (let i = 0; i < notificationsToCreate; i++) {
    const notificationBody = {
      shopping_mall_admin_id: authorizedAdmin.id,
      related_risk_case_id: null,
      related_legal_hold_id: null,
      type: RandomGenerator.name(1),
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.paragraph({
        sentences: 8,
        wordMin: 3,
        wordMax: 10,
      }),
      status: "unread",
      priority: RandomGenerator.pick(["low", "normal", "high"] as const),
      entity_type: RandomGenerator.pick([
        "order",
        "seller",
        "risk_case",
        "dispute",
      ] as const),
      entity_id: null,
      entity_display: null,
      read_at: null,
      archived_at: null,
    } satisfies IShoppingMallAdminNotification.ICreate;

    const created: IShoppingMallAdminNotification =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        { body: notificationBody },
      );
    typia.assert<IShoppingMallAdminNotification>(created);
    createdNotifications.push(created);
  }

  // 3. Fetch aggregated admin activity statistics
  const stats: IShoppingMallAdminActivityStatistics =
    await api.functional.shoppingMall.admin.statistics.adminActivities.index(
      connection,
    );
  typia.assert<IShoppingMallAdminActivityStatistics>(stats);

  // 4. Basic invariants: totals and uniqueness
  TestValidator.predicate(
    "total actions is non-negative int32",
    stats.totalActions >= 0,
  );

  TestValidator.predicate(
    "unique admins active is at least one",
    stats.uniqueAdminsActive >= 1,
  );

  TestValidator.predicate(
    "total actions is at least the number of created notifications (lower bound)",
    stats.totalActions >= createdNotifications.length,
  );

  // 5. Validate time-series actionsPerDay
  TestValidator.predicate(
    "actionsPerDay array is not empty",
    stats.actionsPerDay.length > 0,
  );

  const totalActionsFromSeries = stats.actionsPerDay.reduce(
    (sum, point) => sum + point.count,
    0,
  );

  TestValidator.predicate(
    "sum of daily action counts is non-negative",
    totalActionsFromSeries >= 0,
  );

  TestValidator.predicate(
    "sum of daily action counts is at least created notifications (lower bound)",
    totalActionsFromSeries >= createdNotifications.length,
  );

  for (const point of stats.actionsPerDay) {
    TestValidator.predicate(
      "daily action count is non-negative",
      point.count >= 0,
    );
  }

  // 6. Validate distribution by action type
  TestValidator.predicate(
    "actionsByType has at least one bucket",
    stats.actionsByType.length > 0,
  );

  for (const bucket of stats.actionsByType) {
    TestValidator.predicate(
      "action type bucket count is non-negative",
      bucket.count >= 0,
    );
  }

  // 7. Validate KPI summary fields are non-negative
  TestValidator.predicate(
    "ordersProcessed KPI is non-negative",
    stats.kpis.ordersProcessed >= 0,
  );
  TestValidator.predicate(
    "refundsProcessed KPI is non-negative",
    stats.kpis.refundsProcessed >= 0,
  );
  TestValidator.predicate(
    "disputesClosed KPI is non-negative",
    stats.kpis.disputesClosed >= 0,
  );
  TestValidator.predicate(
    "activeRiskCases KPI is non-negative",
    stats.kpis.activeRiskCases >= 0,
  );
}
