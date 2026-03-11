import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_assignments_by_super_admins_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Get current timestamp for date range testing
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  // Test 1: Filter by current day only
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();
  const todayResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: todayStart,
          created_at_end: todayEnd,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(todayResults);
  // Test 2: Filter by past week
  const weekAgo = new Date(now.getTime() - oneWeekMs).toISOString();
  const weekResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: weekAgo,
          created_at_end: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(weekResults);
  // Test 3: Filter with pagination
  const paginatedResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: weekAgo,
          created_at_end: now.toISOString(),
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Test 4: Empty results for future date range
  const futureStart = new Date(now.getTime() + oneWeekMs).toISOString();
  const futureEnd = new Date(now.getTime() + 2 * oneWeekMs).toISOString();
  const futureResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureStart,
          created_at_end: futureEnd,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(futureResults);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records should be non-negative",
    weekResults.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be non-negative",
    weekResults.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination current should be positive",
    weekResults.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit should match request",
    weekResults.pagination.limit,
    10,
  );
  // Validate that future date range returns empty data
  TestValidator.equals(
    "future date range should return empty data",
    futureResults.data.length,
    0,
  );
  // Validate pagination with small limit
  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResults.data.length <= 2,
  );
  // Additional validation: Ensure all returned assignments are within date range
  if (weekResults.data.length > 0) {
    for (const assignment of weekResults.data) {
      const assignmentDate = new Date(assignment.created_at);
      const startDate = new Date(weekAgo);
      const endDate = new Date(now.toISOString());
      TestValidator.predicate(
        "assignment should be within date range",
        assignmentDate >= startDate && assignmentDate <= endDate,
      );
    }
  }
}
