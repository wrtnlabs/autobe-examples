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

export async function test_api_administrator_assignments_by_members_filtered_by_type_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Test 1: Search with assignment_type filter
  const promotionAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(promotionAssignments);
  // Test 2: Search with role transition filters
  const memberToAdminAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(memberToAdminAssignments);
  // Test 3: Search with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(dateRangeAssignments);
  // Test 4: Search with text filter
  const textSearchAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          search: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(textSearchAssignments);
  // Test 5: Search with combined filters
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
          old_role: "member",
          new_role: "admin",
          search: "test",
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 6: Search for non-existent assignment type (should return empty)
  const nonExistentType =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "non_existent_type",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(nonExistentType);
  TestValidator.equals(
    "non-existent type returns empty",
    nonExistentType.data.length,
    0,
  );
  // Test 7: Test pagination
  const paginatedResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 5,
  );
}
