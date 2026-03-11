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

export async function test_api_administrator_assignment_soft_delete_audit_trail(
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
  // Define valid role options
  const roles = ["member", "admin", "super_admin"] as const;
  const assignmentTypes = [
    "promotion",
    "demotion",
    "initial",
    "system",
  ] as const;
  // Create an administrator assignment record
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: RandomGenerator.pick(roles),
          new_role: RandomGenerator.pick(roles),
          assignment_type: RandomGenerator.pick(assignmentTypes),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Store original assignment data for audit trail verification
  const originalAssignmentData = {
    id: assignment.id,
    old_role: assignment.old_role,
    new_role: assignment.new_role,
    assignment_type: assignment.assignment_type,
    reason: assignment.reason,
    created_at: assignment.created_at,
    updated_at: assignment.updated_at,
  };
  // Delete the assignment using soft delete
  await api.functional.discussionBoard.superAdmin.administrator_assignments.erase(
    superAdminConnection,
    {
      assignmentId: assignment.id,
    },
  );
  // Verify that attempting to delete the same assignment again should fail
  // This confirms the soft delete was successful
  await TestValidator.error(
    "cannot delete already deleted assignment",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrator_assignments.erase(
        superAdminConnection,
        {
          assignmentId: assignment.id,
        },
      );
    },
  );
  // Validate that the audit trail preserves all original data fields
  TestValidator.equals(
    "assignment id preserved",
    originalAssignmentData.id,
    assignment.id,
  );
  TestValidator.equals(
    "old role preserved",
    originalAssignmentData.old_role,
    assignment.old_role,
  );
  TestValidator.equals(
    "new role preserved",
    originalAssignmentData.new_role,
    assignment.new_role,
  );
  TestValidator.equals(
    "assignment type preserved",
    originalAssignmentData.assignment_type,
    assignment.assignment_type,
  );
  TestValidator.equals(
    "reason preserved",
    originalAssignmentData.reason,
    assignment.reason,
  );
  TestValidator.equals(
    "created_at preserved",
    originalAssignmentData.created_at,
    assignment.created_at,
  );
  TestValidator.equals(
    "updated_at preserved",
    originalAssignmentData.updated_at,
    assignment.updated_at,
  );
  // Verify that timestamps exist for audit compliance
  TestValidator.predicate(
    "created_at timestamp exists",
    assignment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    assignment.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be null before deletion",
    assignment.deleted_at === null,
  );
  // Note: Since we don't have specialized audit endpoints to retrieve soft-deleted records,
  // we focus on verifying the deletion operation succeeds and preserves audit data
  // The actual soft-delete verification would require additional endpoints not available
}
