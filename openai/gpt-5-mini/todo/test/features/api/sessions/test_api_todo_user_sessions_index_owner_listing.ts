import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todo_user_sessions_index_owner_listing(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Happy-path E2E test for owner-scoped session listing.
   * - Steps:
   *
   *   1. Register (join) a new todoUser via POST /auth/todoUser/join
   *   2. Use returned authorization (SDK sets connection.headers.Authorization)
   *   3. Call PATCH /todoApp/todoUser/todoUsers/{todoUserId}/sessions with
   *        page/pageSize
   *   4. Assert pagination metadata and per-session summaries belong to the owner
   */

  // 1) Create a fresh todoUser (self-signup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd2025",
    displayName: RandomGenerator.name(),
    // Provide required session context URIs
    href: "https://example.com/welcome",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  // Validate authorized structure and capture id/token
  typia.assert(authorized);

  // 2) Prepare session listing request
  const sessionsRequest = {
    page: 1,
    pageSize: 10,
  } satisfies ITodoAppTodouserSession.IRequest;

  // 3) Call the sessions index endpoint as the authenticated owner
  const page: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoUser.todoUsers.sessions.index(connection, {
      todoUserId: authorized.id,
      body: sessionsRequest,
    });

  // 4) Validate response shape and business rules
  typia.assert(page);

  // Basic structural checks
  TestValidator.predicate("data is array", Array.isArray(page.data));
  TestValidator.equals(
    "pagination current equals request page",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive and reasonable",
    page.pagination.limit >= 1 && page.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );

  // Per-item validations
  for (const item of page.data) {
    // Typing and core shape validated by typia.assert on the whole page; but
    // assert each item individually for clarity and isolation.
    typia.assert<ITodoAppTodouserSession.ISummary>(item);

    // Sessions must be scoped to the requested owner
    TestValidator.equals(
      "session belongs to owner",
      item.user.id,
      authorized.id,
    );

    // createdAt must exist and be an ISO date-time string (typia.assert covers format)
    TestValidator.predicate(
      "session has createdAt",
      item.createdAt !== undefined && item.createdAt !== null,
    );

    // expiredAt is allowed to be null
    TestValidator.predicate(
      "expiredAt is string or null",
      item.expiredAt === null || typeof item.expiredAt === "string",
    );
  }

  // Additional sanity: if no sessions exist yet, data may be empty but structure stays valid
  TestValidator.predicate(
    "pagination pages consistent",
    page.pagination.pages >= 0,
  );
}
