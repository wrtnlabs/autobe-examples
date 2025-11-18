import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * E2E test for retrieving a Todo List administrator session by ID with proper
 * authentication.
 *
 * This test validates the core workflow for Todo List administrators managing
 * their sessions:
 *
 * 1. An administrator joins (creates account and authenticates).
 * 2. The authenticated administrator creates a new session providing connection
 *    metadata.
 * 3. The administrator retrieves the session using the unique session ID.
 *
 * The test verifies correct data types and values, and confirms only authorized
 * administrators can access detailed session information. It also asserts
 * session data integrity across creation and retrieval operations.
 */
export async function test_api_todo_list_admin_session_get_by_id_with_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin id is uuid", typeof admin.id === "string");

  // 2. Create a new admin session
  const sessionCreate: ITodoListAdminSession.ICreate = {
    ip: "192.168.0.1",
    href: "https://todo-list.example.com/admin/dashboard",
    referrer: "https://todo-list.example.com/login",
    expired_at: null,
  };

  const createdSession: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.create(
      connection,
      {
        todoListAdminId: admin.id,
        body: sessionCreate,
      },
    );
  typia.assert(createdSession);

  // 3. Retrieve the created admin session by ID
  const retrievedSession: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.at(
      connection,
      {
        todoListAdminId: admin.id,
        id: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Validate that the retrieved session matches the created session
  TestValidator.equals(
    "retrieved session id matches created",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "retrieved session admin id matches created",
    retrievedSession.todoListAdminId,
    createdSession.todoListAdminId,
  );
  TestValidator.equals(
    "retrieved session IP matches created",
    retrievedSession.ip,
    sessionCreate.ip,
  );
  TestValidator.equals(
    "retrieved session href matches created",
    retrievedSession.href,
    sessionCreate.href,
  );
  TestValidator.equals(
    "retrieved session referrer matches created",
    retrievedSession.referrer,
    sessionCreate.referrer,
  );

  if (retrievedSession.expired_at === null) {
    TestValidator.equals(
      "retrieved session expired_at is null",
      retrievedSession.expired_at,
      null,
    );
  } else {
    TestValidator.predicate(
      "retrieved session expired_at has valid date-time format",
      typeof retrievedSession.expired_at === "string",
    );
  }
  TestValidator.predicate(
    "retrieved session created_at has valid date-time format",
    typeof retrievedSession.created_at === "string",
  );
}
