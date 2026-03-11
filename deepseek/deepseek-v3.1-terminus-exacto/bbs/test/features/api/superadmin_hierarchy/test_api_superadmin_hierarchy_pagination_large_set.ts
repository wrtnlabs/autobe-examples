import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_hierarchy_pagination_large_set(
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
  // Create multiple regular admin accounts
  await ArrayUtil.asyncRepeat(12, async (index) => {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  });
  // Create multiple super admin accounts
  await ArrayUtil.asyncRepeat(5, async (index) => {
    const superAdminConn: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(superAdminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
  });
  // Retrieve hierarchy data
  const hierarchy =
    await api.functional.discussionBoard.superAdmin.hierarchy.at(
      superAdminConnection,
    );
  typia.assert(hierarchy);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination limit positive",
    hierarchy.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page valid",
    hierarchy.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    hierarchy.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    hierarchy.pagination.pages ===
      Math.ceil(hierarchy.pagination.records / hierarchy.pagination.limit),
  );
  // Validate data structure matches expected DTO
  TestValidator.equals(
    "data array length matches limit",
    hierarchy.data.length,
    hierarchy.pagination.limit,
  );
  // Validate each assignment record has correct structure
  for (const assignment of hierarchy.data) {
    TestValidator.predicate("assignment has id", assignment.id.length > 0);
    TestValidator.predicate(
      "assignment has old_role",
      assignment.old_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has new_role",
      assignment.new_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has assignment_type",
      assignment.assignment_type.length > 0,
    );
    TestValidator.predicate(
      "assignment has created_at",
      assignment.created_at.length > 0,
    );
    // reason can be null, so no validation needed
  }
}
