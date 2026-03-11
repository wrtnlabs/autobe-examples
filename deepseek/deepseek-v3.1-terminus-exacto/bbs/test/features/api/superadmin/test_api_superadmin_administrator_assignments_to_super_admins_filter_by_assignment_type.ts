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
 * Test filtering administrator assignments by specific assignment types (promotion, demotion, initial, system).
 * This scenario validates that the search operation correctly filters results based on assignment type criteria.
 */
export async function test_api_superadmin_administrator_assignments_to_super_admins_filter_by_assignment_type(
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
  // Test filtering by assignment types
  const assignmentTypes = [
    "promotion",
    "demotion",
    "initial",
    "system",
  ] as const;
  for (const assignmentType of assignmentTypes) {
    // Search with specific assignment type filter
    const response =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
        superAdminConnection,
        {
          body: {
            assignment_type: assignmentType,
          } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure
    TestValidator.predicate(
      "response should have valid pagination structure",
      () => {
        return (
          response.pagination.current >= 0 &&
          response.pagination.limit >= 0 &&
          response.pagination.records >= 0 &&
          response.pagination.pages >= 0
        );
      },
    );
    // Validate assignment summary structure for each returned record
    for (const assignment of response.data) {
      TestValidator.equals(
        `assignment should have type ${assignmentType}`,
        assignment.assignment_type,
        assignmentType,
      );
      // Validate recipient structure
      TestValidator.predicate(
        "recipient should have valid super admin structure",
        () => {
          return (
            typeof assignment.recipient.id === "string" &&
            typeof assignment.recipient.email === "string" &&
            typeof assignment.recipient.admin_grade === "string" &&
            typeof assignment.recipient.created_at === "string" &&
            typeof assignment.recipient.updated_at === "string"
          );
        },
      );
    }
  }
  // Test combination filtering with other criteria
  const combinationResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(combinationResponse);
  // Validate pagination with specific page/limit
  TestValidator.predicate(
    "pagination should respect page and limit parameters",
    () => {
      return (
        combinationResponse.pagination.current === 1 &&
        combinationResponse.pagination.limit === 10 &&
        combinationResponse.data.length <= 10
      );
    },
  );
  // Test filtering with null assignment type (should not filter by type)
  const nullFilterResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_super_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: null,
        } satisfies IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest,
      },
    );
  typia.assert(nullFilterResponse);
  // Null filter should return valid pagination structure
  TestValidator.predicate("null filter should return valid pagination", () => {
    return (
      nullFilterResponse.pagination.current >= 0 &&
      nullFilterResponse.pagination.limit >= 0 &&
      nullFilterResponse.pagination.records >= 0 &&
      nullFilterResponse.pagination.pages >= 0
    );
  });
}
