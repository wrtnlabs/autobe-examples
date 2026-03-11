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
import { generate_random_discussion_board_super_admin_administrator_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_administrator_assignments_create";
import { prepare_random_discussion_board_administrator_assignment } from "../../../prepare/prepare_random_discussion_board_administrator_assignment";

export async function test_api_administrator_assignments_filter_by_type(
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
  // Define assignment types and their corresponding role transitions
  const assignmentTypes = [
    {
      type: "promotion",
      old_role: "member",
      new_role: "admin",
      reason: "Promoted to admin",
    },
    {
      type: "demotion",
      old_role: "admin",
      new_role: "member",
      reason: "Demoted to member",
    },
    {
      type: "initial",
      old_role: "member",
      new_role: "admin",
      reason: "Initial admin assignment",
    },
    {
      type: "system",
      old_role: "admin",
      new_role: "super_admin",
      reason: "System upgrade",
    },
  ] as const;
  // Create assignments for each type
  const createdAssignments: IDiscussionBoardAdministratorAssignment[] = [];
  for (const assignmentConfig of assignmentTypes) {
    const assignment =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.create(
        superAdminConnection,
        {
          body: {
            old_role: assignmentConfig.old_role,
            new_role: assignmentConfig.new_role,
            assignment_type: assignmentConfig.type,
            reason: assignmentConfig.reason,
          } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
        },
      );
    typia.assert(assignment);
    createdAssignments.push(assignment);
  }
  // Test filtering by each assignment type
  for (const assignmentType of assignmentTypes) {
    const searchResults =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
        superAdminConnection,
        {
          body: {
            assignment_type: assignmentType.type,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
        },
      );
    typia.assert(searchResults);
    // Verify that all returned assignments match the filtered type
    TestValidator.equals(
      `all assignments should be of type ${assignmentType.type}`,
      searchResults.data.every(
        (assignment) => assignment.assignment_type === assignmentType.type,
      ),
      true,
    );
    // Verify that assignments with correct role transitions exist
    const matchingAssignments = searchResults.data.filter(
      (assignment) =>
        assignment.old_role === assignmentType.old_role &&
        assignment.new_role === assignmentType.new_role,
    );
    TestValidator.predicate(
      `should find assignments with ${assignmentType.old_role} -> ${assignmentType.new_role} transition`,
      matchingAssignments.length > 0,
    );
    // Verify pagination metadata
    TestValidator.predicate(
      `pagination records should be accurate for ${assignmentType.type}`,
      searchResults.pagination.records >= matchingAssignments.length,
    );
  }
  // Test empty result case with non-existent assignment type
  const emptySearchResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "non_existent_type",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search results should have no data",
    emptySearchResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty search results should have records=0",
    emptySearchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results should have pages=0",
    emptySearchResults.pagination.pages,
    0,
  );
}
