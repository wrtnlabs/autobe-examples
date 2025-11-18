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

export async function test_api_admin_statistics_admin_activities_multiple_admins_and_action_types(
  connection: api.IConnection,
) {
  // 1. Create two separate admin accounts (Admin A and Admin B)
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // Under Admin A context, create notifications for Admin A
  const adminANotificationTypes = [
    "risk_sla_violation",
    "refund_escalation",
  ] as const;

  const adminANotifications: IShoppingMallAdminNotification[] = [];

  for (const type of adminANotificationTypes) {
    const notificationBody = {
      shopping_mall_admin_id: adminA.id,
      type,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      status: "unread",
    } satisfies IShoppingMallAdminNotification.ICreate;

    const notification: IShoppingMallAdminNotification =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        { body: notificationBody },
      );
    typia.assert<IShoppingMallAdminNotification>(notification);
    adminANotifications.push(notification);
  }

  // Create Admin B and switch context to Admin B
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  // 3. Under Admin B, create several notifications of another type
  const adminBNotificationType = "seller_approval_needed" as const;

  const adminBNotifications: IShoppingMallAdminNotification[] = [];

  for (let i = 0; i < 2; i++) {
    const notificationBody = {
      shopping_mall_admin_id: adminB.id,
      type: adminBNotificationType,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      status: "unread",
    } satisfies IShoppingMallAdminNotification.ICreate;

    const notification: IShoppingMallAdminNotification =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        { body: notificationBody },
      );
    typia.assert<IShoppingMallAdminNotification>(notification);
    adminBNotifications.push(notification);
  }

  // Aggregate local counts by type
  const localTypeCounts = new Map<string, number>();
  const allNotifications: IShoppingMallAdminNotification[] = [
    ...adminANotifications,
    ...adminBNotifications,
  ];

  for (const n of allNotifications) {
    const prev = localTypeCounts.get(n.type) ?? 0;
    localTypeCounts.set(n.type, prev + 1);
  }

  const totalNotificationCount = allNotifications.length;

  // Capture today's date string in YYYY-MM-DD
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // date part

  // 4. Call statistics endpoint using current admin context (Admin B token)
  const stats: IShoppingMallAdminActivityStatistics =
    await api.functional.shoppingMall.admin.statistics.adminActivities.index(
      connection,
    );
  typia.assert<IShoppingMallAdminActivityStatistics>(stats);

  // 5. Basic numeric validations
  TestValidator.predicate(
    "totalActions should be at least the number of created notifications",
    stats.totalActions >= totalNotificationCount,
  );

  TestValidator.predicate(
    "uniqueAdminsActive should be at least 2 when two admins performed actions",
    stats.uniqueAdminsActive >= 2,
  );

  TestValidator.predicate(
    "disputesResolvedCount must be non-negative",
    stats.disputesResolvedCount >= 0,
  );
  TestValidator.predicate(
    "policyOverridesCount must be non-negative",
    stats.policyOverridesCount >= 0,
  );

  // 6. Validate actionsByType buckets
  for (const [type, expectedCount] of localTypeCounts.entries()) {
    const bucket = stats.actionsByType.find((b) => b.type === type);

    TestValidator.predicate(
      `actionsByType must contain bucket for type ${type}`,
      bucket !== undefined,
    );

    if (bucket) {
      TestValidator.predicate(
        `bucket count for type ${type} should be >= locally created notifications`,
        bucket.count >= expectedCount,
      );
    }
  }

  // 7. Validate actionsPerDay (best-effort for today's date)
  const todayPoint = stats.actionsPerDay.find((p) => p.date === today);

  if (todayPoint) {
    TestValidator.predicate(
      "actionsPerDay today count should be >= number of created notifications",
      todayPoint.count >= totalNotificationCount,
    );
  }

  // 8. Validate KPI summary non-negative
  const kpis = stats.kpis;

  TestValidator.predicate(
    "kpis.ordersProcessed must be non-negative",
    kpis.ordersProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.refundsProcessed must be non-negative",
    kpis.refundsProcessed >= 0,
  );
  TestValidator.predicate(
    "kpis.disputesClosed must be non-negative",
    kpis.disputesClosed >= 0,
  );
  TestValidator.predicate(
    "kpis.activeRiskCases must be non-negative",
    kpis.activeRiskCases >= 0,
  );
}
