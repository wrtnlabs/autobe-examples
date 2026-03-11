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

/**
 * Test successful search of administrator assignment records with pagination.
 * 1. Create super admin connection
 * 2. Create multiple administrator assignments to populate search results
 * 3. Perform search with pagination parameters (page=1, limit=10)
 * 4. Validate pagination metadata and assignment summary fields
 */
export async function test_api_administrator_assignments_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create multiple administrator assignments
  const assignments: IDiscussionBoardAdministratorAssignment[] = [];
  // Create first assignment
  const assignment1 =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
          assignment_type: "promotion",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment1);
  assignments.push(assignment1);
  // Create second assignment
  const assignment2 =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "admin",
          new_role: "super_admin",
          assignment_type: "promotion",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment2);
  assignments.push(assignment2);
  // Create third assignment
  const assignment3 =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "super_admin",
          new_role: "admin",
          assignment_type: "demotion",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment3);
  assignments.push(assignment3);
  // 3. Perform search with pagination
  const pageValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const searchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          page: pageValue,
          limit: limitValue,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals(
    "current page",
    searchResult.pagination.current,
    pageValue,
  );
  TestValidator.equals("limit", searchResult.pagination.limit, limitValue);
  TestValidator.predicate(
    "total records >= created assignments",
    searchResult.pagination.records >= assignments.length,
  );
  TestValidator.predicate(
    "total pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "data length <= limit",
    searchResult.data.length <= limitValue,
  );
  if (searchResult.data.length > 0) {
    // Validate first assignment summary fields
    const firstAssignment = searchResult.data[0];
    TestValidator.predicate(
      "has id field",
      typeof firstAssignment.id === "string",
    );
    TestValidator.predicate(
      "has old_role field",
      typeof firstAssignment.old_role === "string",
    );
    TestValidator.predicate(
      "has new_role field",
      typeof firstAssignment.new_role === "string",
    );
    TestValidator.predicate(
      "has assignment_type field",
      typeof firstAssignment.assignment_type === "string",
    );
    TestValidator.predicate(
      "has reason field",
      firstAssignment.reason === null ||
        typeof firstAssignment.reason === "string",
    );
    TestValidator.predicate(
      "has created_at field",
      typeof firstAssignment.created_at === "string",
    );
  }
}
