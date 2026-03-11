import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_super_admin_administrator_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_administrator_assignments_create";
import { prepare_random_discussion_board_administrator_assignment } from "../../../prepare/prepare_random_discussion_board_administrator_assignment";

export async function test_api_administrator_assignment_promote_admin_to_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Execute promotion from admin to super_admin
  // Note: The assignment endpoint creates a record but doesn't actually change administrator roles
  // This test validates the assignment creation functionality
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "admin",
          new_role: "super_admin",
          assignment_type: "promotion",
          reason:
            "Promotion to super administrator for platform governance expansion",
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 4. Validate assignment record properties
  TestValidator.equals(
    "old role should be admin",
    assignment.old_role,
    "admin",
  );
  TestValidator.equals(
    "new role should be super_admin",
    assignment.new_role,
    "super_admin",
  );
  TestValidator.equals(
    "assignment type should be promotion",
    assignment.assignment_type,
    "promotion",
  );
  TestValidator.predicate(
    "should have valid creation timestamp",
    assignment.created_at.length > 0,
  );
}
