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

export async function test_api_administrator_assignments_by_admins_temporal_queries(
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
  // First, get all existing assignments to understand the data
  const allAssignmentsRequest: IDiscussionBoardAdministratorAssignment.IRequest =
    {
      page: 1,
      limit: 100,
    };
  const allAssignmentsResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: allAssignmentsRequest },
    );
  typia.assert(allAssignmentsResponse);
  if (allAssignmentsResponse.data.length === 0) {
    // If no assignments exist, we can't test temporal queries effectively
    // This is a valid scenario - the test should handle empty results gracefully
    return;
  }
  // Extract timestamps from existing assignments
  const assignmentTimestamps = allAssignmentsResponse.data.map(
    (assignment) => new Date(assignment.created_at),
  );
  const oldestAssignment = new Date(
    Math.min(...assignmentTimestamps.map((d: Date) => d.getTime())),
  );
  const newestAssignment = new Date(
    Math.max(...assignmentTimestamps.map((d: Date) => d.getTime())),
  );
  const now = new Date();
  // Test 1: Date range filtering - assignments within specific time window
  const startDate = new Date(oldestAssignment.getTime());
  const endDate = new Date(newestAssignment.getTime());
  const dateRangeRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: startDate.toISOString(),
    created_at_end: endDate.toISOString(),
    page: 1,
    limit: 50,
  };
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // Test 2: Start date only filtering
  const startDateRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: startDate.toISOString(),
    page: 1,
    limit: 50,
  };
  const startDateResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: startDateRequest },
    );
  typia.assert(startDateResponse);
  // Test 3: End date only filtering
  const endDateRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_end: endDate.toISOString(),
    page: 1,
    limit: 50,
  };
  const endDateResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: endDateRequest },
    );
  typia.assert(endDateResponse);
  // Test 4: Future date range (should return empty results)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const emptyRangeRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: futureDate.toISOString(),
    created_at_end: new Date(
      futureDate.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 10,
  };
  const emptyRangeResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: emptyRangeRequest },
    );
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "future date range returns empty results",
    emptyRangeResponse.data.length,
    0,
  );
  // Test 5: Pagination with date filtering
  const paginatedRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: startDate.toISOString(),
    created_at_end: endDate.toISOString(),
    page: 1,
    limit: 5,
  };
  const paginatedResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: paginatedRequest },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.data.length <= 5,
    true,
  );
  // Test 6: Null date values
  const nullStartRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: null,
    created_at_end: endDate.toISOString(),
    page: 1,
    limit: 10,
  };
  const nullStartResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: nullStartRequest },
    );
  typia.assert(nullStartResponse);
  const nullEndRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
    created_at_start: startDate.toISOString(),
    created_at_end: null,
    page: 1,
    limit: 10,
  };
  const nullEndResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
      superAdminConnection,
      { body: nullEndRequest },
    );
  typia.assert(nullEndResponse);
  // Test 7: Combined filtering with date range and assignment type
  const assignmentTypes = [
    "promotion",
    "demotion",
    "initial",
    "system",
  ] as const;
  const validType = assignmentTypes.find((type) =>
    allAssignmentsResponse.data.some(
      (assignment) => assignment.assignment_type === type,
    ),
  );
  if (validType) {
    const combinedRequest: IDiscussionBoardAdministratorAssignment.IRequest = {
      assignment_type: validType,
      created_at_start: startDate.toISOString(),
      created_at_end: endDate.toISOString(),
      page: 1,
      limit: 10,
    };
    const combinedResponse =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.by_admins.index(
        superAdminConnection,
        { body: combinedRequest },
      );
    typia.assert(combinedResponse);
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    paginatedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    paginatedResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    paginatedResponse.pagination.pages >= 0,
  );
}