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

export async function test_api_superadmin_hierarchy_empty_system(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Retrieve hierarchy
  const hierarchy =
    await api.functional.discussionBoard.superAdmin.hierarchy.at(
      superAdminConnection,
    );
  typia.assert(hierarchy);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    hierarchy.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    hierarchy.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count non-negative",
    hierarchy.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    hierarchy.pagination.pages >= 0,
  );
  // Validate pagination calculations
  const expectedPages = Math.ceil(
    hierarchy.pagination.records / hierarchy.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    hierarchy.pagination.pages,
    expectedPages,
  );
  // The hierarchy endpoint returns administrator assignment records, not direct admin accounts
  // Validate the structure of assignment records
  TestValidator.predicate("data is array", Array.isArray(hierarchy.data));
  // Validate assignment record structure if any exist
  if (hierarchy.data.length > 0) {
    const assignment = hierarchy.data[0];
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
  }
}
