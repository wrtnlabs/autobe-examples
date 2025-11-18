import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppRateLimitEvent";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate admin search of rate limit events with time-window filters and
 * sorting.
 *
 * Business context:
 *
 * - Member users perform todo write operations (create, complete, reopen) that
 *   may be subject to rate limiting rules (e.g., limit_type "todo_write").
 * - Administrators need to inspect rate limit events across a time window,
 *   optionally filtered by logical key/type, and review them in sorted order
 *   with pagination.
 *
 * Test steps:
 *
 * 1. Register and implicitly authenticate a member user using
 *    auth.memberUser.join.
 * 2. Generate a burst of todo traffic as that member:
 *
 *    - Record a timestamp before starting traffic (startBoundary).
 *    - Create multiple todos via todoApp.memberUser.todos.create.
 *    - For at least one todo, call complete and reopen in quick succession.
 *    - Record a timestamp after traffic (endBoundary).
 * 3. Register and implicitly authenticate an admin user using auth.adminUser.join.
 * 4. As the admin, call todoApp.adminUser.rateLimitEvents.index with an
 *    ITodoAppRateLimitEvent.IRequest body that:
 *
 *    - Sets window_start_from to startBoundary and window_start_to to endBoundary.
 *    - Sets page=1 and pageSize to a small positive int (e.g., 20).
 *    - Optionally sets limit_type to "todo_write" to reflect todo write rules.
 * 5. Assert that:
 *
 *    - The response structure matches IPageITodoAppRateLimitEvent.ISummary using
 *         typia.assert.
 *    - Every event’s window_start (if any results) is between the requested from/to
 *         inclusive.
 *    - If limit_type was provided, every event’s limit_type equals that value.
 * 6. Change sort_by and sort_order and re-query:
 *
 *    - Use sort_by = "created_at" (a supported time field) and sort_order = "desc";
 *         assert the results are ordered descending by created_at.
 *    - Use sort_by = "created_at" and sort_order = "asc"; assert the results are
 *         ordered ascending by created_at.
 *    - Comparisons should be done by comparing Date.getTime() values.
 *
 * The test is robust to empty result sets: when no data is returned, it only
 * validates the structural correctness and does not enforce range or ordering
 * checks.
 */
export async function test_api_admin_rate_limit_events_search_with_time_window_and_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 2. Generate todo traffic as member
  const startBoundary = new Date().toISOString();

  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 3; i++) {
    const todoCreateBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert(todo);
    todos.push(todo);
  }

  if (todos.length > 0) {
    const targetTodo: ITodoAppTodo = todos[0];

    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: targetTodo.id,
      });
    typia.assert(completed);

    const reopened: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: targetTodo.id,
      });
    typia.assert(reopened);
  }

  const endBoundary = new Date().toISOString();

  // 3. Register and authenticate admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. Admin searches rate limit events within time window
  const baseRequestBody = {
    actor_type: null,
    ip: null,
    limit_key: null,
    limit_type: "todo_write",
    window_start_from: startBoundary,
    window_start_to: endBoundary,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_order: null,
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const firstPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: baseRequestBody,
    });
  typia.assert(firstPage);

  // 5. Validate time window and limit_type filters if data exists
  if (firstPage.data.length > 0) {
    const fromMs = Date.parse(baseRequestBody.window_start_from!);
    const toMs = Date.parse(baseRequestBody.window_start_to!);

    for (const event of firstPage.data) {
      const windowStartMs = Date.parse(event.window_start);

      TestValidator.predicate(
        "event window_start must be within requested range",
        () => windowStartMs >= fromMs && windowStartMs <= toMs,
      );

      if (baseRequestBody.limit_type !== null) {
        TestValidator.equals(
          "event limit_type must match requested limit_type when specified",
          event.limit_type,
          baseRequestBody.limit_type,
        );
      }
    }
  }

  // 6. Sorting checks using created_at
  const descRequestBody = {
    ...baseRequestBody,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const descPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: descRequestBody,
    });
  typia.assert(descPage);

  if (descPage.data.length > 1) {
    for (let i = 1; i < descPage.data.length; i++) {
      const prev = descPage.data[i - 1];
      const curr = descPage.data[i];
      const prevTime = Date.parse(prev.created_at);
      const currTime = Date.parse(curr.created_at);

      TestValidator.predicate(
        "events should be ordered by created_at desc",
        () => prevTime >= currTime,
      );
    }
  }

  const ascRequestBody = {
    ...baseRequestBody,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const ascPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: ascRequestBody,
    });
  typia.assert(ascPage);

  if (ascPage.data.length > 1) {
    for (let i = 1; i < ascPage.data.length; i++) {
      const prev = ascPage.data[i - 1];
      const curr = ascPage.data[i];
      const prevTime = Date.parse(prev.created_at);
      const currTime = Date.parse(curr.created_at);

      TestValidator.predicate(
        "events should be ordered by created_at asc",
        () => prevTime <= currTime,
      );
    }
  }
}
