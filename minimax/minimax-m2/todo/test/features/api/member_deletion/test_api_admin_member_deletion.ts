import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test complete admin member deletion workflow with comprehensive validation.
 *
 * This test validates that authenticated administrators can perform soft
 * deletion of member accounts while maintaining data integrity and audit
 * trails. The workflow includes admin authentication, member account creation,
 * privileged deletion operation, and validation of soft deletion behavior.
 *
 * Business Context: Ensures proper access control where only administrators can
 * delete members, maintains compliance through soft deletion, and preserves
 * audit trails while preventing member access to the system.
 *
 * Test Flow:
 *
 * 1. Admin account creation and authentication
 * 2. Member account creation for deletion testing
 * 3. Admin-level soft deletion execution
 * 4. Validation of deletion behavior and data integrity
 */
export async function test_api_admin_member_deletion(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminTest123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create test member account that will be deleted
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberTest123!";

  // First register the member through auth system
  const memberAuth: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(memberAuth);

  // Then create the member profile in the TodoApp system
  const member: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: memberEmail,
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Store member ID for deletion operation
  const memberId = member.id;

  // 3. Authenticate as administrator for deletion operation
  const adminLogin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/members",
        referrer: "https://admin.example.com/dashboard",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // 4. Execute admin-level soft deletion of the member account
  const deletedMember: ITodoAppMember =
    await api.functional.todoApp.admin.members.erase(connection, {
      memberId: memberId,
    });
  typia.assert(deletedMember);

  // 5. Validate soft deletion behavior and data integrity
  TestValidator.equals(
    "member ID should remain consistent",
    deletedMember.id,
    memberId,
  );
  TestValidator.equals(
    "member email should be preserved",
    deletedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member status should be maintained",
    deletedMember.status,
    "active",
  );

  // Verify soft deletion timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp should be set",
    deletedMember.deleted_at !== null && deletedMember.deleted_at !== undefined,
  );

  // Verify creation and update timestamps are preserved for audit trail
  TestValidator.equals(
    "created_at should be preserved",
    deletedMember.created_at,
    member.created_at,
  );
  TestValidator.equals(
    "updated_at should reflect deletion time",
    deletedMember.updated_at,
    deletedMember.deleted_at,
  );

  // Verify deleted member cannot access the system (would require additional validation)
  // The soft deletion ensures the member is marked inactive while preserving data
}
