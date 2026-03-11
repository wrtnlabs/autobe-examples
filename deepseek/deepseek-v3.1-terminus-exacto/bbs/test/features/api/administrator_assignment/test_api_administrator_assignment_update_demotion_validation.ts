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
 * Test updating an administrator assignment record for a demotion scenario with validation checks.
 * Create an assignment record demoting a super administrator to admin, then update it with
 * valid changes to assignment type and reason. Validate that the system properly maintains
 * audit trail integrity while allowing legitimate updates.
 */
export async function test_api_administrator_assignment_update_demotion_validation(
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
  // 2. Create a demotion assignment record (super_admin -> admin)
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "super_admin",
          new_role: "admin",
          assignment_type: "demotion",
          reason: "Performance review demotion",
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 3. Test valid update: change assignment_type from 'demotion' to 'system'
  const validUpdate =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: assignment.id,
        body: {
          assignment_type: "system",
          reason: "System-initiated role adjustment",
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(validUpdate);
  // Validate the update was successful
  TestValidator.equals(
    "assignment type updated",
    validUpdate.assignment_type,
    "system",
  );
  TestValidator.equals(
    "reason updated",
    validUpdate.reason,
    "System-initiated role adjustment",
  );
  TestValidator.equals(
    "old_role unchanged",
    validUpdate.old_role,
    "super_admin",
  );
  TestValidator.equals("new_role unchanged", validUpdate.new_role, "admin");
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(validUpdate.updated_at) > new Date(assignment.created_at),
  );
  // 4. Test another valid update: change back to 'demotion' with different reason
  const secondUpdate =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.update(
      superAdminConnection,
      {
        assignmentId: assignment.id,
        body: {
          assignment_type: "demotion",
          reason: "Final demotion decision",
        } satisfies IDiscussionBoardAdministratorAssignment.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Validate the second update
  TestValidator.equals(
    "assignment type reverted",
    secondUpdate.assignment_type,
    "demotion",
  );
  TestValidator.equals(
    "reason updated again",
    secondUpdate.reason,
    "Final demotion decision",
  );
  TestValidator.predicate(
    "second updated_at should be later than first",
    new Date(secondUpdate.updated_at) > new Date(validUpdate.updated_at),
  );
  // 5. Final validation of audit trail integrity
  TestValidator.equals(
    "id remains consistent throughout",
    secondUpdate.id,
    assignment.id,
  );
  TestValidator.equals(
    "old_role preserved throughout",
    secondUpdate.old_role,
    "super_admin",
  );
  TestValidator.equals(
    "new_role preserved throughout",
    secondUpdate.new_role,
    "admin",
  );
  TestValidator.equals(
    "created_at unchanged",
    secondUpdate.created_at,
    assignment.created_at,
  );
}
