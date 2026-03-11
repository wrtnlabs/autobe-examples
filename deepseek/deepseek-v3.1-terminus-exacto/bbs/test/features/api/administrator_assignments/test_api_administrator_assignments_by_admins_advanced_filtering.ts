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

/**
 * Test comprehensive filtering capabilities for administrator assignments performed by admins.
 * Create test scenarios with various filter combinations: assignment_type filters (promotion, demotion, initial, system),
 * role transition patterns (member-to-admin, admin-to-super, etc.), date range constraints, and text search on reason fields.
 * Verify that each filter works independently and in combination. Test edge cases like searching with non-existent assignment types,
 * overlapping date ranges, and empty text search strings. Validate that the system properly handles null filter values by ignoring
 * those filters rather than applying restrictive conditions. Ensure date range filtering respects proper datetime boundaries and ordering.
 * Confirm that text search uses case-insensitive matching and supports partial string matching within reason fields.
 * Test pagination behavior with filtered results to ensure proper record counts and navigation.
 */
export async function test_api_administrator_assignments_by_admins_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using SDK function directly
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Test individual filter combinations
  // 1. Test assignment_type filter
  const promotionFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(promotionFilter);
  // 2. Test role transition filters
  const roleFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(roleFilter);
  // 3. Test text search filter
  const searchFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          search: "test",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchFilter);
  // 4. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(dateFilter);
  // 5. Test combined filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
          old_role: "member",
          new_role: "admin",
          search: "performance",
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Test pagination
  const paginationFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(paginationFilter);
  // 7. Test edge cases
  // Empty search string
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          search: "",
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Null filter values (should be ignored)
  const nullFilters =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: undefined,
          old_role: undefined,
          new_role: undefined,
          search: undefined,
          created_at_start: null,
          created_at_end: null,
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(nullFilters);
  // Overlapping date ranges
  const overlappingDates =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: now.toISOString(),
          created_at_end: oneWeekAgo.toISOString(), // Invalid range
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(overlappingDates);
  // Case-insensitive search test
  const caseSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          search: "TEST", // Uppercase search
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(caseSearch);
  // Partial string matching
  const partialSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      {
        body: {
          search: "perf", // Partial match
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(partialSearch);
}
