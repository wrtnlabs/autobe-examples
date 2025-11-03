import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todo_user_session_retrieve_by_id(
  connection: api.IConnection,
) {
  /**
   * 1. Create a fresh todo user (self-signup) to obtain an authorized actor and
   *    ensure at least one session exists for that user.
   */
  const signupBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: signupBody,
    });
  typia.assert(authorized);

  // Basic sanity checks on authorization payload
  TestValidator.predicate(
    "authorized contains id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "authorized token present",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  /** 2. List sessions for the created user to discover an existing session id. */
  const sessionsPage: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoUser.todoUsers.sessions.index(connection, {
      todoUserId: authorized.id,
      body: {
        page: 1,
        pageSize: 10,
      } satisfies ITodoAppTodouserSession.IRequest,
    });
  typia.assert(sessionsPage);

  // Ensure we have at least one session to test with
  TestValidator.predicate(
    "sessions list contains at least one session",
    Array.isArray(sessionsPage.data) && sessionsPage.data.length > 0,
  );

  const sessionId: string = sessionsPage.data[0].id;

  /** 3. Retrieve the session by id using the owner's authenticated connection. */
  const session: ITodoAppTodouserSession =
    await api.functional.todoApp.todoUser.todoUsers.sessions.at(connection, {
      todoUserId: authorized.id,
      sessionId,
    });
  typia.assert(session);

  /** 4. Business-level validations */
  TestValidator.equals(
    "session id matches requested id",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session belongs to the expected user",
    session.user.id,
    authorized.id,
  );

  TestValidator.predicate(
    "session ip is non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );

  TestValidator.predicate(
    "session href is non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer is null or string",
    session.referrer === null || typeof session.referrer === "string",
  );

  TestValidator.predicate(
    "session createdAt is a valid ISO date-time",
    !isNaN(Date.parse(session.createdAt)),
  );

  TestValidator.predicate(
    "session expiredAt is null/undefined or a valid ISO date-time",
    session.expiredAt === null ||
      session.expiredAt === undefined ||
      !isNaN(Date.parse(session.expiredAt!)),
  );

  // Trust typia.assert for structural type safety - no sensitive fields should be present per DTO
  typia.assert(session);
}
