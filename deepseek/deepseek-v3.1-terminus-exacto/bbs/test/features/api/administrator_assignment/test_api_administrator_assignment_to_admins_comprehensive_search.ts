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

export async function test_api_administrator_assignment_to_admins_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with no filters (should return all assignments)
  const allAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(allAssignments);
  TestValidator.predicate(
    "should have pagination metadata",
    allAssignments.pagination.current >= 1 &&
      allAssignments.pagination.limit >= 1 &&
      allAssignments.pagination.records >= 0 &&
      allAssignments.pagination.pages >= 0,
  );
  // Test 2: Search by assignment_type
  const promotionAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(promotionAssignments);
  // Test 3: Search by role transitions
  const roleTransitionAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(roleTransitionAssignments);
  // Test 4: Search by text in reason field
  const textSearchAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          search: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(textSearchAssignments);
  // Test 5: Search by date range
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday,
          created_at_end: now,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(dateRangeAssignments);
  // Test 6: Test pagination with page and limit
  const paginatedAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(paginatedAssignments);
  TestValidator.equals(
    "page should be 1",
    paginatedAssignments.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    paginatedAssignments.pagination.limit,
    10,
  );
  // Test 7: Search with no matching results
  const noResultsAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "nonexistent_type",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(noResultsAssignments);
  TestValidator.predicate(
    "should handle no matching results gracefully",
    noResultsAssignments.pagination.records >= 0,
  );
  // Test 8: Search with all filters applied
  const comprehensiveSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
          old_role: "member",
          new_role: "admin",
          search: "test",
          created_at_start: yesterday,
          created_at_end: now,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);
  // Validate assignment summary structure
  if (allAssignments.data.length > 0) {
    const assignment = allAssignments.data[0];
    TestValidator.predicate(
      "should have id field",
      typeof assignment.id === "string",
    );
    TestValidator.predicate(
      "should have old_role field",
      typeof assignment.old_role === "string",
    );
    TestValidator.predicate(
      "should have new_role field",
      typeof assignment.new_role === "string",
    );
    TestValidator.predicate(
      "should have assignment_type field",
      typeof assignment.assignment_type === "string",
    );
    TestValidator.predicate(
      "should have created_at field",
      typeof assignment.created_at === "string",
    );
    // reason can be null
    TestValidator.predicate(
      "reason should be string or null",
      assignment.reason === null || typeof assignment.reason === "string",
    );
  }
}
