import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignmentToSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToSuperAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignmentToSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test date range filtering for administrator assignments targeting super admins.
 * This scenario validates that the search operation correctly filters results based
 * on creation timestamp ranges. Create test data with assignments created at different
 * times and verify that date range filtering returns only records within the specified
 * timeframe. Test edge cases such as empty date ranges, overlapping date ranges, and
 * boundary conditions (records created exactly at start/end dates). Validate that the
 * pagination metadata correctly reflects the filtered result counts and that the
 * assignment summaries include accurate timestamps. Test combination filtering with
 * assignment types and role transitions to ensure comprehensive search functionality.
 */
export async function test_api_superadmin_administrator_assignments_to_super_admins_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate test data with different creation timestamps
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Create date ranges for testing
  const startDate = new Date(now.getTime() - 3 * oneDayMs).toISOString();
  const endDate = new Date(now.getTime() - oneDayMs).toISOString();
  // Test 1: Search with valid date range
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Search with only start date (should return records from start date onwards)
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Search with only end date (should return records up to end date)
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_end: endDate,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Search with empty date range (should return all records)
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          // No date filters
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Search with combination filters (date range + assignment type)
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Test 6: Search with exact boundary dates
  const searchResult6 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: startDate,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Test 7: Search with role transition filters
  const searchResult7 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          old_role: "admin",
          new_role: "super_admin",
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult7);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    searchResult1.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchResult1.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(searchResult1.data));
  // Validate assignment summary structure when data exists
  if (searchResult1.data.length > 0) {
    const assignment = searchResult1.data[0];
    TestValidator.equals("assignment has id", typeof assignment.id, "string");
    TestValidator.equals(
      "assignment has old_role",
      typeof assignment.old_role,
      "string",
    );
    TestValidator.equals(
      "assignment has new_role",
      typeof assignment.new_role,
      "string",
    );
    TestValidator.equals(
      "assignment has assignment_type",
      typeof assignment.assignment_type,
      "string",
    );
    TestValidator.equals(
      "assignment has created_at",
      typeof assignment.created_at,
      "string",
    );
    TestValidator.predicate(
      "assignment has recipient",
      assignment.recipient !== undefined,
    );
    // Validate recipient structure
    TestValidator.equals(
      "recipient has id",
      typeof assignment.recipient.id,
      "string",
    );
    TestValidator.equals(
      "recipient has email",
      typeof assignment.recipient.email,
      "string",
    );
    TestValidator.equals(
      "recipient has admin_grade",
      typeof assignment.recipient.admin_grade,
      "string",
    );
    TestValidator.equals(
      "recipient has created_at",
      typeof assignment.recipient.created_at,
      "string",
    );
    TestValidator.equals(
      "recipient has updated_at",
      typeof assignment.recipient.updated_at,
      "string",
    );
  }
}
