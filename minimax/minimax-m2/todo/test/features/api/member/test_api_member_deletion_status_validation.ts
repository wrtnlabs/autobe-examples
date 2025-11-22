import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_deletion_status_validation(
  connection: api.IConnection,
) {
  // Test member self-deletion with different initial account status scenarios
  // This test validates that soft deletion works consistently across different account statuses

  // First, test deletion with an active member account
  const activeMemberEmail = typia.random<string & tags.Format<"email">>();
  const activeMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: activeMemberEmail,
        status: "active",
        first_name: "Active",
        last_name: "Member",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(activeMember);

  // Test deletion of active member
  const deletedActiveMember: ITodoAppMember =
    await api.functional.todoApp.member.members.erase(connection, {
      memberId: activeMember.id,
    });
  typia.assert(deletedActiveMember);

  // Validate active member deletion - should have deleted_at timestamp
  TestValidator.equals(
    "active member should be soft deleted",
    deletedActiveMember.deleted_at !== undefined &&
      deletedActiveMember.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "active member ID should be preserved",
    deletedActiveMember.id,
    activeMember.id,
  );
  TestValidator.equals(
    "active member status should be preserved",
    deletedActiveMember.status,
    "active",
  );

  // Second, test deletion with a suspended member account
  const suspendedMemberEmail = typia.random<string & tags.Format<"email">>();
  const suspendedMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: suspendedMemberEmail,
        status: "suspended",
        first_name: "Suspended",
        last_name: "Member",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(suspendedMember);

  // Test deletion of suspended member
  const deletedSuspendedMember: ITodoAppMember =
    await api.functional.todoApp.member.members.erase(connection, {
      memberId: suspendedMember.id,
    });
  typia.assert(deletedSuspendedMember);

  // Validate suspended member deletion - should still work
  TestValidator.equals(
    "suspended member should be soft deleted",
    deletedSuspendedMember.deleted_at !== undefined &&
      deletedSuspendedMember.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "suspended member ID should be preserved",
    deletedSuspendedMember.id,
    suspendedMember.id,
  );
  TestValidator.equals(
    "suspended member status should be preserved",
    deletedSuspendedMember.status,
    "suspended",
  );

  // Third, test deletion with a deactivated member account
  const deactivatedMemberEmail = typia.random<string & tags.Format<"email">>();
  const deactivatedMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: deactivatedMemberEmail,
        status: "deactivated",
        first_name: "Deactivated",
        last_name: "Member",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(deactivatedMember);

  // Test deletion of deactivated member
  const deletedDeactivatedMember: ITodoAppMember =
    await api.functional.todoApp.member.members.erase(connection, {
      memberId: deactivatedMember.id,
    });
  typia.assert(deletedDeactivatedMember);

  // Validate deactivated member deletion - should still work
  TestValidator.equals(
    "deactivated member should be soft deleted",
    deletedDeactivatedMember.deleted_at !== undefined &&
      deletedDeactivatedMember.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "deactivated member ID should be preserved",
    deletedDeactivatedMember.id,
    deactivatedMember.id,
  );
  TestValidator.equals(
    "deactivated member status should be preserved",
    deletedDeactivatedMember.status,
    "deactivated",
  );

  // Validate timestamp formats and audit trail consistency
  const activeDeletedAt = new Date(deletedActiveMember.deleted_at!);
  const suspendedDeletedAt = new Date(deletedSuspendedMember.deleted_at!);
  const deactivatedDeletedAt = new Date(deletedDeactivatedMember.deleted_at!);

  TestValidator.predicate(
    "all deleted_at timestamps should be valid ISO date-time format",
    !isNaN(activeDeletedAt.getTime()) &&
      !isNaN(suspendedDeletedAt.getTime()) &&
      !isNaN(deactivatedDeletedAt.getTime()),
  );

  // Validate that audit trail fields are properly maintained
  TestValidator.equals(
    "created_at timestamps should be preserved in all deletions",
    deletedActiveMember.created_at === activeMember.created_at &&
      deletedSuspendedMember.created_at === suspendedMember.created_at &&
      deletedDeactivatedMember.created_at === deactivatedMember.created_at,
    true,
  );

  TestValidator.equals(
    "email addresses should be preserved in all deletions",
    deletedActiveMember.email === activeMember.email &&
      deletedSuspendedMember.email === suspendedMember.email &&
      deletedDeactivatedMember.email === deactivatedMember.email,
    true,
  );

  TestValidator.equals(
    "updated_at should be updated after deletion",
    deletedActiveMember.updated_at !== activeMember.updated_at &&
      deletedSuspendedMember.updated_at !== suspendedMember.updated_at &&
      deletedDeactivatedMember.updated_at !== deactivatedMember.updated_at,
    true,
  );
}
