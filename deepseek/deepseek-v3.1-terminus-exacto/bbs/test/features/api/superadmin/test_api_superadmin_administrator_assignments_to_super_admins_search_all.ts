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
 * Test the comprehensive search functionality for administrator assignments targeting super admins.
 * Validates search and filtering capabilities with various criteria including assignment type,
 * role transitions, date ranges, and pagination controls.
 */
export async function test_api_superadmin_administrator_assignments_to_super_admins_search_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test search with empty criteria (should return all assignments)
  const emptySearchResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  // 3. Test search with assignment type filter
  const promotionSearchResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(promotionSearchResponse);
  // Verify all returned assignments are of type "promotion"
  if (promotionSearchResponse.data.length > 0) {
    for (const assignment of promotionSearchResponse.data) {
      TestValidator.equals(
        "assignment type is promotion",
        assignment.assignment_type,
        "promotion",
      );
    }
  }
  // 4. Test search with role transition filters
  const roleTransitionResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          old_role: "admin",
          new_role: "super_admin",
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(roleTransitionResponse);
  // Verify role transitions match filter criteria
  if (roleTransitionResponse.data.length > 0) {
    for (const assignment of roleTransitionResponse.data) {
      TestValidator.equals(
        "old role matches filter",
        assignment.old_role,
        "admin",
      );
      TestValidator.equals(
        "new role matches filter",
        assignment.new_role,
        "super_admin",
      );
    }
  }
  // 5. Test search with date range filter
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 6. Test pagination with custom page and limit
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "page number matches request",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginationResponse.data.length <= 5,
  );
  // 7. Test search with reason text filter
  const reasonSearchResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          reason: "performance",
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(reasonSearchResponse);
}
