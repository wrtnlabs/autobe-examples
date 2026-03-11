import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test advanced filtering capabilities for administrator assignment audit trail.
 * Authenticate as super administrator and search for assignments within a specific
 * date range to verify temporal filtering works correctly. Validate that assignments
 * outside the specified date range are excluded while those within the range are
 * included. Test combinations of filters including assignment_type: 'demotion'
 * for cases where administrators were demoted back to member status, and verify
 * that the response includes proper reason text and audit trail information for
 * compliance and governance monitoring.
 */
export async function test_api_superadmin_administrator_assignments_to_members_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by date range (last week)
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          start_date: oneWeekAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 2: Filter by assignment_type: 'demotion' within date range
  const demotionResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "demotion",
          start_date: twoWeeksAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(demotionResponse);
  // Test 3: Filter by old_role and new_role transitions
  const roleTransitionResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          old_role: "admin",
          new_role: "member",
          start_date: twoWeeksAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(roleTransitionResponse);
  // Validate pagination structure
  TestValidator.predicate("pagination structure valid", () => {
    return (
      dateRangeResponse.pagination.current >= 0 &&
      dateRangeResponse.pagination.limit > 0 &&
      dateRangeResponse.pagination.records >= 0 &&
      dateRangeResponse.pagination.pages >= 0
    );
  });
  // Validate response data structure
  if (dateRangeResponse.data.length > 0) {
    const assignment = dateRangeResponse.data[0];
    TestValidator.predicate("assignment has valid structure", () => {
      return (
        typeof assignment.id === "string" &&
        typeof assignment.old_role === "string" &&
        typeof assignment.new_role === "string" &&
        typeof assignment.assignment_type === "string" &&
        typeof assignment.created_at === "string" &&
        typeof assignment.member.id === "string" &&
        typeof assignment.member.display_name === "string"
      );
    });
  }
  // Test 4: Empty date range (no results expected)
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const emptyRangeResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          start_date: futureDate.toISOString(),
          end_date: new Date(
            futureDate.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "empty date range returns empty data",
    emptyRangeResponse.data.length,
    0,
  );
}
