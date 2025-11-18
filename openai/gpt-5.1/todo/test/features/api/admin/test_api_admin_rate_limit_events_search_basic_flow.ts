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
 * Basic admin rate limit events search flow.
 *
 * This test validates that:
 *
 * 1. A member user can be registered and can generate todo write traffic.
 * 2. An admin user can be registered (and implicitly authenticated).
 * 3. The admin can search rate limit events with a minimal
 *    ITodoAppRateLimitEvent.IRequest.
 * 4. The response matches IPageITodoAppRateLimitEvent.ISummary and contains
 *    consistent pagination metadata and well-typed summary rows.
 *
 * The test does not assume that rate limiting is actually triggered; it only
 * ensures that the search endpoint works and returns a structurally correct
 * paginated response, even when the data array is empty.
 */
export async function test_api_admin_rate_limit_events_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Generate several todos as the member to produce write traffic
  const todoCount = 5;
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < todoCount; i += 1) {
    const createBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: createBody,
      });
    typia.assert(todo);
    todos.push(todo);
  }

  TestValidator.equals(
    "member created expected number of todos",
    todos.length,
    todoCount,
  );

  // 3. Optionally complete and reopen the first todo to add more write activity
  const targetTodo: ITodoAppTodo | undefined = todos[0];
  if (targetTodo) {
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

  // 4. Register an admin user and obtain admin authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As the admin, search rate limit events with minimal filters
  const requestBody = {
    actor_type: undefined,
    ip: undefined,
    limit_key: undefined,
    limit_type: undefined,
    window_start_from: undefined,
    window_start_to: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: undefined,
    sort_order: undefined,
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const page: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 6. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  if (page.data.length > 0) {
    // 7. Validate one sample rate limit event summary structurally and logically
    const sample: ITodoAppRateLimitEvent.ISummary = page.data[0];
    typia.assert<ITodoAppRateLimitEvent.ISummary>(sample);

    TestValidator.predicate(
      "sample rate-limit event has non-empty id",
      sample.id.length > 0,
    );
    TestValidator.predicate(
      "sample rate-limit event has non-empty limit_key",
      sample.limit_key.length > 0,
    );
    TestValidator.predicate(
      "sample rate-limit event has non-empty limit_type",
      sample.limit_type.length > 0,
    );
    TestValidator.predicate(
      "sample rate-limit window_start precedes or equals window_end",
      new Date(sample.window_start).getTime() <=
        new Date(sample.window_end).getTime(),
    );

    // Actor type should be plausible for member-generated todo traffic,
    // but we don't strictly assert value set here, only non-empty string.
    TestValidator.predicate(
      "sample rate-limit actor_type is non-empty",
      sample.actor_type.length > 0,
    );
  }
}
