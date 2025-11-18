import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test deleting an existing Todo List admin session record by session ID.
 * Ensures only authenticated admins can perform deletion after the session has
 * been created. Validates deletion endpoint behavior and access control.
 */
export async function test_api_todo_list_admin_session_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new Todo List admin to authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongPass123";

  // Prepare the admin join payload
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITodoListAdmin.ICreate;

  // Call the join API - authentication token will be automatically handled in connection
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Create a new admin session for the authenticated admin
  // Prepare session creation payload
  const createSessionBody = {
    ip: "192.168.1.1",
    href: `https://example.com/admin/dashboard`,
    referrer: `https://example.com/login`,
    expired_at: null,
  } satisfies ITodoListAdminSession.ICreate;

  const newSession: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.create(
      connection,
      {
        todoListAdminId: adminAuth.id,
        body: createSessionBody,
      },
    );
  typia.assert(newSession);
  TestValidator.equals(
    "created session belongs to admin",
    newSession.todoListAdminId,
    adminAuth.id,
  );

  // 3. Delete the admin session by its ID
  await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.erase(
    connection,
    {
      todoListAdminId: adminAuth.id,
      id: newSession.id,
    },
  );

  // 4. Attempt to delete the same session again - expect error
  await TestValidator.error(
    "deleting already deleted session should fail",
    async () => {
      await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.erase(
        connection,
        {
          todoListAdminId: adminAuth.id,
          id: newSession.id,
        },
      );
    },
  );

  // 5. Optionally, test unauthenticated deletion attempt failure
  // Create a new unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const anotherSession: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.create(
      connection,
      {
        todoListAdminId: adminAuth.id,
        body: {
          ip: "192.168.1.2",
          href: `https://example.com/admin/settings`,
          referrer: `https://example.com/login`,
          expired_at: null,
        } satisfies ITodoListAdminSession.ICreate,
      },
    );
  typia.assert(anotherSession);

  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.erase(
        unauthenticatedConnection,
        {
          todoListAdminId: adminAuth.id,
          id: anotherSession.id,
        },
      );
    },
  );
}
