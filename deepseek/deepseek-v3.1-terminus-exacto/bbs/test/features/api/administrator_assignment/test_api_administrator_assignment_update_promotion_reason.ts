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

export async function test_api_administrator_assignment_update_promotion_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create initial administrator assignment record
  const initialAssignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
          assignment_type: "promotion",
          reason: null,
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // Store original timestamps for validation
  const originalCreatedAt = initialAssignment.created_at;
  const originalUpdatedAt = initialAssignment.updated_at;
  // Update the assignment record
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: initialAssignment.id,
        body: {
          assignment_type: "initial",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Validate update was successful
  TestValidator.equals(
    "assignment ID preserved",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "old_role preserved",
    updatedAssignment.old_role,
    initialAssignment.old_role,
  );
  TestValidator.equals(
    "new_role preserved",
    updatedAssignment.new_role,
    initialAssignment.new_role,
  );
  TestValidator.equals(
    "assignment_type updated",
    updatedAssignment.assignment_type,
    "initial",
  );
  TestValidator.predicate("reason added", updatedAssignment.reason !== null);
  // Validate timestamp integrity
  TestValidator.equals(
    "created_at unchanged",
    updatedAssignment.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedAssignment.updated_at,
    originalUpdatedAt,
  );
}
