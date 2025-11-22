import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthSession";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuthSession";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test unauthorized access to administrative session management functionality.
 *
 * Validates that member users cannot access administrative session overview
 * endpoints and receive proper authorization error responses, ensuring proper
 * access control enforcement between different user roles in the TodoApp
 * system.
 *
 * This test verifies the security boundary between member and administrator
 * privileges by attempting to access administrative functionality using
 * non-admin credentials and confirming appropriate rejection.
 */
export async function test_api_admin_sessions_unauthorized_access(
  connection: api.IConnection,
) {
  // Create administrator account for test environment setup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create member account for unauthorized access testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "Test",
        last_name: "Member",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Login as member to establish non-administrative session context
  const memberLogin: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string>(),
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/login",
      } satisfies ITodoAppMember.ILogin,
    });
  typia.assert(memberLogin);

  // Attempt to access administrative session overview with member credentials
  // This should fail with authorization error, demonstrating proper access control
  await TestValidator.error(
    "member user cannot access admin sessions endpoint",
    async () => {
      await api.functional.todoApp.admin.auth.sessions.index(connection);
    },
  );
}
