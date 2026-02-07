import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_dashboard_date_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Dashboard with specific date range
  const dashboard1 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
          end_date: new Date("2024-01-31T23:59:59Z").toISOString(),
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard1);
  // Test 2: Dashboard with weekly aggregation
  const dashboard2 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
          end_date: new Date("2024-02-01T00:00:00Z").toISOString(),
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "weekly",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard2);
  // Test 3: Dashboard with monthly aggregation
  const dashboard3 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
          end_date: new Date("2024-12-31T23:59:59Z").toISOString(),
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "monthly",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard3);
  // Test 4: Dashboard with null dates (all time)
  const dashboard4 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: null,
          end_date: null,
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard4);
  // Test 5: Dashboard with undefined dates (default behavior)
  const dashboard5 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard5);
  // Test 6: Dashboard with overlapping dates
  const dashboard6 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date("2024-01-15T00:00:00Z").toISOString(),
          end_date: new Date("2024-01-10T23:59:59Z").toISOString(), // End before start
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard6);
  // Test 7: Dashboard with specific stats disabled
  const dashboard7 =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
          end_date: new Date("2024-01-31T23:59:59Z").toISOString(),
          include_user_stats: false,
          include_content_stats: true,
          include_performance_stats: false,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboard7);
  // Validate that all dashboard responses have the expected super admin structure
  TestValidator.predicate(
    "dashboard1 has super admin structure",
    dashboard1.id !== undefined && dashboard1.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard2 has super admin structure",
    dashboard2.id !== undefined && dashboard2.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard3 has super admin structure",
    dashboard3.id !== undefined && dashboard3.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard4 has super admin structure",
    dashboard4.id !== undefined && dashboard4.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard5 has super admin structure",
    dashboard5.id !== undefined && dashboard5.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard6 has super admin structure",
    dashboard6.id !== undefined && dashboard6.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard7 has super admin structure",
    dashboard7.id !== undefined && dashboard7.email !== undefined,
  );
}
