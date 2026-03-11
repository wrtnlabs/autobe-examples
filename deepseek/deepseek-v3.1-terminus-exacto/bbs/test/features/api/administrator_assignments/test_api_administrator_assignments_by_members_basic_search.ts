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

export async function test_api_administrator_assignments_by_members_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Perform basic search without filters (default pagination)
  const searchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate assignment records structure
  if (searchResult.data.length > 0) {
    const assignment = searchResult.data[0];
    TestValidator.predicate(
      "assignment has id",
      typeof assignment.id === "string" && assignment.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has old_role",
      typeof assignment.old_role === "string" && assignment.old_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has new_role",
      typeof assignment.new_role === "string" && assignment.new_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has assignment_type",
      typeof assignment.assignment_type === "string" &&
        assignment.assignment_type.length > 0,
    );
    TestValidator.predicate(
      "assignment has created_at",
      typeof assignment.created_at === "string" &&
        assignment.created_at.length > 0,
    );
    // Reason can be null, so only check if it exists
    if (assignment.reason !== null) {
      TestValidator.predicate(
        "assignment reason is string",
        typeof assignment.reason === "string",
      );
    }
    // 5. Validate chronological order (newest first)
    if (searchResult.data.length > 1) {
      const firstDate = new Date(searchResult.data[0].created_at);
      const secondDate = new Date(searchResult.data[1].created_at);
      TestValidator.predicate(
        "assignments are in chronological order",
        firstDate >= secondDate,
      );
    }
  }
  // 6. Test pagination with different parameters
  const page2Result =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 7. Test unauthorized access should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  });
}
