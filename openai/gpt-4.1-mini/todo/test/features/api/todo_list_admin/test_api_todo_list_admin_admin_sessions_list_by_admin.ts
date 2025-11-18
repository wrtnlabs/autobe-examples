import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate listing of paginated administrator sessions for a target
 * TodoListAdmin.
 *
 * This test performs the entire workflow of an admin user joining
 * (authenticating), obtaining a valid authorization token, then using that
 * token to retrieve paginated session data for a specific TodoListAdmin. It
 * validates that the authentication enforcement is proper and that the
 * retrieved session data matches expected structure.
 *
 * Steps:
 *
 * 1. Perform admin join request to create/admin login an administrator.
 * 2. Extract the admin's unique ID and authorization token from the response.
 * 3. Use the authorized connection to PATCH the admin sessions listing endpoint
 *    for the target admin ID, including pagination parameters.
 * 4. Validate the response has valid pagination info and session summary array.
 * 5. Repeat with multiple requests to verify consistent and valid pagination.
 */
export async function test_api_todo_list_admin_admin_sessions_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "Passw0rd!",
  } satisfies ITodoListAdmin.ICreate;

  const adminAuthorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Extract admin ID
  const todoListAdminId = typia.assert<string & tags.Format<"uuid">>(
    adminAuthorized.id,
  );

  // 3. Prepare pagination request body
  const sessionsRequestBody: ITodoListAdminSession.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    expired: false,
  };

  // 4. Retrieve paginated admin sessions
  const sessionPage1: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.index(
      connection,
      {
        todoListAdminId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(sessionPage1);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    sessionPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    sessionPage1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    sessionPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent",
    sessionPage1.pagination.pages >= 1,
  );

  // Validate session data type
  TestValidator.predicate(
    "session data is array",
    Array.isArray(sessionPage1.data),
  );

  // Validate each session summary
  for (const session of sessionPage1.data) {
    typia.assert<ITodoListAdminSession.ISummary>(session);
    TestValidator.predicate(
      `session id ${session.id} is UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      `session todo_list_admin_id matches`,
      session.todo_list_admin_id === todoListAdminId,
    );
    TestValidator.predicate(
      `session ip present`,
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      `session href present`,
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      `session referrer present`,
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      `session created_at date-time format`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        session.created_at,
      ),
    );
  }

  // 5. Optionally, repeat for a second page if any
  if (sessionPage1.pagination.pages > 1) {
    const sessionPage2: IPageITodoListAdminSession.ISummary =
      await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.index(
        connection,
        {
          todoListAdminId,
          body: {
            ...sessionsRequestBody,
            page: 2,
          },
        },
      );
    typia.assert(sessionPage2);

    TestValidator.equals(
      "second page current number",
      sessionPage2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "session data second page array",
      Array.isArray(sessionPage2.data),
    );
  }
}
