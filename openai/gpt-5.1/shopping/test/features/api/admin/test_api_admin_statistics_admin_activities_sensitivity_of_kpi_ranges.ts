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

export async function test_api_admin_statistics_admin_activities_sensitivity_of_kpi_ranges(
  connection: api.IConnection,
) {
  /**
   * Validate admin activity statistics sensitivity and KPI ranges under
   * governance-only activity.
   *
   * Business intent:
   *
   * - Provision a fresh admin via POST /auth/admin/join.
   * - Generate a moderate amount of pure governance activity by creating several
   *   admin notifications through POST /shoppingMall/admin/adminNotifications.
   * - Fetch aggregated admin activity statistics through GET
   *   /shoppingMall/admin/statistics/adminActivities.
   * - Validate that KPI counters are non-negative, that bucketed statistics
   *   structures are coherent, and that totalActions reasonably reflects at
   *   least the number of created notifications.
   *
   * Steps:
   *
   * 1. Join an admin and obtain an authorized admin context.
   * 2. Create N (between 5 and 10) IShoppingMallAdminNotification records with
   *    varying types, statuses, and priorities but without touching orders,
   *    refunds, disputes, or risk case entities.
   * 3. Call statistics.adminActivities.index to retrieve
   *    IShoppingMallAdminActivityStatistics.
   * 4. Assert structural invariants (non-negative counts, arrays not null).
   * 5. Assert reasonable relationships, such as totalActions >= notification count
   *    and uniqueAdminsActive >= 1.
   */

  // 1. Admin join: create a fresh administrator and implicit token.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip:
      Math.random() < 0.5
        ? typia.random<string & tags.Format<"ipv4">>()
        : typia.random<string & tags.Format<"ipv6">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Ensure token and basic identity look sane via type-safe checks.
  TestValidator.predicate(
    "admin join should provide non-empty access token",
    adminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin join should provide non-empty refresh token",
    adminAuthorized.token.refresh.length > 0,
  );

  const adminId = adminAuthorized.id;

  // 2. Create a moderate number of admin notifications as governance activity.
  const notificationCount: number &
    tags.Type<"int32"> &
    tags.Minimum<5> &
    tags.Maximum<10> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<10>
  >();

  const notificationTypes = [
    "governance_info",
    "risk_monitoring",
    "ops_alert",
    "config_change",
  ] as const;
  const priorities = ["low", "normal", "high"] as const;
  const statuses = ["unread", "read"] as const;

  const createdNotifications: IShoppingMallAdminNotification[] =
    await ArrayUtil.asyncRepeat(notificationCount, async () => {
      const body = {
        shopping_mall_admin_id: adminId,
        related_risk_case_id: null,
        related_legal_hold_id: null,
        type: RandomGenerator.pick(notificationTypes),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 8 }),
        status: RandomGenerator.pick(statuses),
        priority: RandomGenerator.pick(priorities),
        entity_type: null,
        entity_id: null,
        entity_display: null,
        read_at: null,
        archived_at: null,
      } satisfies IShoppingMallAdminNotification.ICreate;

      const created: IShoppingMallAdminNotification =
        await api.functional.shoppingMall.admin.adminNotifications.create(
          connection,
          { body },
        );
      typia.assert<IShoppingMallAdminNotification>(created);

      return created;
    });

  TestValidator.equals(
    "number of created notifications should equal requested count",
    createdNotifications.length,
    notificationCount,
  );

  // 3. Fetch aggregated admin activity statistics.
  const stats: IShoppingMallAdminActivityStatistics =
    await api.functional.shoppingMall.admin.statistics.adminActivities.index(
      connection,
    );
  typia.assert<IShoppingMallAdminActivityStatistics>(stats);

  const {
    totalActions,
    uniqueAdminsActive,
    disputesResolvedCount,
    policyOverridesCount,
    actionsByType,
    actionsPerDay,
    kpis,
  } = stats;

  // 4. Structural and invariant validations.
  TestValidator.predicate(
    "totalActions should be non-negative",
    totalActions >= 0,
  );
  TestValidator.predicate(
    "uniqueAdminsActive should be non-negative",
    uniqueAdminsActive >= 0,
  );
  TestValidator.predicate(
    "disputesResolvedCount should be non-negative",
    disputesResolvedCount >= 0,
  );
  TestValidator.predicate(
    "policyOverridesCount should be non-negative",
    policyOverridesCount >= 0,
  );

  TestValidator.predicate(
    "kpis.ordersProcessed should be non-negative",
    kpis.ordersProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.refundsProcessed should be non-negative",
    kpis.refundsProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.disputesClosed should be non-negative",
    kpis.disputesClosed >= 0,
  );
  TestValidator.predicate(
    "kpis.activeRiskCases should be non-negative",
    kpis.activeRiskCases >= 0,
  );

  // There must be at least one active admin in the window: the one we just used.
  TestValidator.predicate(
    "uniqueAdminsActive should be at least 1 after admin actions",
    uniqueAdminsActive >= 1,
  );

  // Actions-by-type integrity.
  const sumBucketCounts = actionsByType.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );

  TestValidator.predicate(
    "sum of bucket counts should be non-negative",
    sumBucketCounts >= 0,
  );
  TestValidator.predicate(
    "if actionsByType is non-empty, no bucket count should be negative",
    actionsByType.every((b) => b.count >= 0),
  );

  // totalActions should at least cover the counts attributed to known buckets.
  // We avoid strict equality to remain robust to additional internal actions.
  TestValidator.predicate(
    "totalActions should not be less than max bucket count",
    actionsByType.length === 0
      ? totalActions >= 0
      : totalActions >=
          actionsByType.reduce((max, b) => (b.count > max ? b.count : max), 0),
  );

  // totalActions should also be at least the number of notifications we created.
  TestValidator.predicate(
    "totalActions should be at least number of created notifications",
    totalActions >= notificationCount,
  );

  // Validate optional percentages are in a plausible range (0 <= percentage <= 100).
  TestValidator.predicate(
    "bucket percentages, when present, should be between 0 and 100",
    actionsByType.every((b) =>
      b.percentage === undefined
        ? true
        : b.percentage >= 0 && b.percentage <= 100,
    ),
  );

  // actionsPerDay integrity.
  TestValidator.predicate(
    "actionsPerDay should not contain negative counts",
    actionsPerDay.every((p) => p.count >= 0),
  );

  // No further explicit date-format checks: typia.assert already guarantees
  // tags.Format<"date"> for the date field in actionsPerDay.
}
