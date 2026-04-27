import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test completion status filtering on the paginated todo list endpoint.
 *
 * Validates that the `status` filter parameter correctly partitions todos by their completion state. Creates several todos (all start as incomplete), then queries the list with each filter mode to verify the returned counts are correct.
 *
 * Because no update endpoint is available to toggle completion status, all created todos remain in their initial incomplete state throughout the test. This still validates three filtering conditions:
 *
 * 1. `incomplete` returns all created todos (null completed_at).
 * 2. `complete` returns zero results (no non-null completed_at).
 * 3. `all` returns all created todos regardless of completion state.
 *
 * Verifies that the returned pagination metadata matches expected counts for each filter mode.
 */
export async function test_api_todo_list_completion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create exactly 5 todos (all start incomplete with null completed_at)
  const TOTAL_TODOS = 5;
  const todos = await ArrayUtil.asyncRepeat(TOTAL_TODOS, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  TestValidator.equals("created todos count", todos.length, TOTAL_TODOS);
  // 3. Query with status='incomplete' — expects all 5 todos
  const incompletePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "incomplete",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompletePage);
  TestValidator.equals(
    "incomplete filter count",
    incompletePage.pagination.records,
    TOTAL_TODOS,
  );
  TestValidator.predicate(
    "all returned todos have null completedAt",
    () =>
      incompletePage.data.length === TOTAL_TODOS &&
      incompletePage.data.every((t) => t.completedAt === null),
  );
  // 4. Query with status='complete' — expects 0 todos
  const completePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "complete",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completePage);
  TestValidator.equals(
    "complete filter count",
    completePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter empty data",
    completePage.data.length,
    0,
  );
  // 5. Query with status='all' — expects all 5 todos
  const allPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.equals(
    "all filter count",
    allPage.pagination.records,
    TOTAL_TODOS,
  );
}
