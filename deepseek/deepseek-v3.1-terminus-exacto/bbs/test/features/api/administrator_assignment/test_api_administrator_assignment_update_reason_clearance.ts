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
 * Test updating an administrator assignment record to clear or modify the reason field.
 *
 * This test validates that administrator assignment records can be updated to:
 * 1. Clear the reason field by setting it to null
 * 2. Modify the reason to a different justification
 * 3. Change assignment type while preserving core role transition data
 *
 * The test ensures that updates maintain audit trail integrity while allowing
 * administrative modifications to assignment rationale and classification.
 */
export async function test_api_administrator_assignment_update_reason_clearance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial administrator assignment with detailed reason
  const initialAssignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
          assignment_type: "system",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // 3. Update assignment to clear reason field (set to null)
  const clearedAssignment =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: initialAssignment.id,
        body: {
          reason: null,
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(clearedAssignment);
  // Validate reason was cleared while preserving core data
  TestValidator.equals(
    "assignment ID unchanged",
    clearedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "old role unchanged",
    clearedAssignment.old_role,
    initialAssignment.old_role,
  );
  TestValidator.equals(
    "new role unchanged",
    clearedAssignment.new_role,
    initialAssignment.new_role,
  );
  TestValidator.equals(
    "assignment type unchanged",
    clearedAssignment.assignment_type,
    initialAssignment.assignment_type,
  );
  TestValidator.equals(
    "reason cleared to null",
    clearedAssignment.reason,
    null,
  );
  // 4. Update assignment to modify reason to different justification
  const modifiedAssignment =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: initialAssignment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(modifiedAssignment);
  // Validate reason was modified while preserving core data
  TestValidator.equals(
    "assignment ID still unchanged",
    modifiedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "old role still unchanged",
    modifiedAssignment.old_role,
    initialAssignment.old_role,
  );
  TestValidator.equals(
    "new role still unchanged",
    modifiedAssignment.new_role,
    initialAssignment.new_role,
  );
  TestValidator.equals(
    "assignment type still unchanged",
    modifiedAssignment.assignment_type,
    initialAssignment.assignment_type,
  );
  TestValidator.notEquals(
    "reason modified",
    modifiedAssignment.reason,
    clearedAssignment.reason,
  );
  TestValidator.predicate(
    "reason is not null",
    modifiedAssignment.reason !== null,
  );
  // 5. Test assignment type modification from 'system' to 'promotion'
  const typeModifiedAssignment =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: initialAssignment.id,
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(typeModifiedAssignment);
  // Validate assignment type was changed while preserving core role data
  TestValidator.equals(
    "assignment ID preserved",
    typeModifiedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "old role preserved",
    typeModifiedAssignment.old_role,
    initialAssignment.old_role,
  );
  TestValidator.equals(
    "new role preserved",
    typeModifiedAssignment.new_role,
    initialAssignment.new_role,
  );
  TestValidator.equals(
    "assignment type changed to promotion",
    typeModifiedAssignment.assignment_type,
    "promotion",
  );
  TestValidator.notEquals(
    "assignment type different from original",
    typeModifiedAssignment.assignment_type,
    initialAssignment.assignment_type,
  );
  TestValidator.equals(
    "reason preserved from previous update",
    typeModifiedAssignment.reason,
    modifiedAssignment.reason,
  );
}
