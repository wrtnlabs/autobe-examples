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

export async function test_api_administrator_assignments_by_super_admins_search_all(
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
  // Search all assignment records with default pagination
  const response =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  if (response.data.length > 0) {
    const assignment = response.data[0];
    TestValidator.predicate(
      "assignment has id",
      typeof assignment.id === "string",
    );
    TestValidator.predicate(
      "assignment has old_role",
      typeof assignment.old_role === "string",
    );
    TestValidator.predicate(
      "assignment has new_role",
      typeof assignment.new_role === "string",
    );
    TestValidator.predicate(
      "assignment has assignment_type",
      typeof assignment.assignment_type === "string",
    );
    TestValidator.predicate(
      "assignment has created_at",
      typeof assignment.created_at === "string",
    );
    // reason can be null, so we just check it exists
    TestValidator.predicate(
      "assignment has reason field",
      assignment.reason !== undefined,
    );
  }
}
