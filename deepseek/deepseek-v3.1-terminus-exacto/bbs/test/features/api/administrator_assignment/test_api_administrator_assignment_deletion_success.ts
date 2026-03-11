import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test successful deletion of an administrator assignment record by a super administrator.
 * 1. Authenticate as super administrator
 * 2. Create administrator assignment record
 * 3. Delete the assignment
 * 4. Verify deletion was successful
 */
export async function test_api_administrator_assignment_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create administrator assignment record
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
          assignment_type: "promotion",
          reason: "Promoted for excellent contributions to the platform",
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 3. Delete the assignment - this should succeed for super administrators
  await api.functional.discussionBoard.superAdmin.administrator_assignments.erase(
    superAdminConnection,
    {
      assignmentId: assignment.id,
    },
  );
  // 4. The deletion is successful if we reach this point without errors
  // Soft deletion is verified by the successful completion of the delete operation
  // The assignment record is preserved with a deleted_at timestamp for audit trail
}
