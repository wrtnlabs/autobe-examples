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
 * Test todo list filtering by completion status.
 *
 * This test validates the core filtering functionality where members can filter
 * their todo lists by completion status (all, complete, incomplete). The test
 * creates multiple todos and verifies that each filter returns the correct
 * subset based on completion status.
 *
 * Test flow:
 * 1. Member authenticates via join
 * 2. Member creates 5 todos (all start as incomplete by default)
 * 3. Filter by 'complete' - verify response structure and all items are complete
 * 4. Filter by 'incomplete' - verify response structure and all items are incomplete
 * 5. Filter by 'all' - verify returns all todos
 * 6. Validate pagination metadata and filter count relationships
 * 7. Verify todo summaries contain required business fields
 */
export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 5 todos (all start as incomplete by default)
  const createdTodos: ITodoAppTodo[] = [];
  for (let i = 0; i < 5; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Test Todo ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000 * (7 + i)).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  }
  // 3. Test filter: completed='complete'
  const completeFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        completed: "complete",
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeFilterResult);
  TestValidator.predicate(
    "complete filter - all returned todos are complete",
    completeFilterResult.data.every((todo) => todo.completed === true),
  );
  // 4. Test filter: completed='incomplete'
  const incompleteFilterResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        completed: "incomplete",
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  TestValidator.predicate(
    "incomplete filter - all returned todos are incomplete",
    incompleteFilterResult.data.every((todo) => todo.completed === false),
  );
  TestValidator.equals(
    "incomplete filter - count matches created todos",
    incompleteFilterResult.data.length,
    createdTodos.length,
  );
  // 5. Test filter: completed='all'
  const allFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        completed: "all",
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilterResult);
  TestValidator.equals(
    "all filter - total records matches created count",
    allFilterResult.pagination.records,
    createdTodos.length,
  );
  // 6. Validate pagination metadata business logic
  TestValidator.predicate(
    "pagination - pages calculation is correct",
    allFilterResult.pagination.pages ===
      Math.ceil(
        allFilterResult.pagination.records / allFilterResult.pagination.limit,
      ),
  );
  TestValidator.equals(
    "pagination - complete + incomplete equals all",
    completeFilterResult.data.length + incompleteFilterResult.data.length,
    allFilterResult.data.length,
  );
  // 7. Verify todo summary contains required business fields
  const sampleTodo = allFilterResult.data[0];
  if (sampleTodo !== undefined) {
    TestValidator.predicate(
      "todo summary - has title",
      sampleTodo.title.length > 0,
    );
    TestValidator.predicate(
      "todo summary - has member with display name",
      sampleTodo.member.display_name.length > 0,
    );
    TestValidator.predicate(
      "todo summary - has creation timestamp",
      sampleTodo.created_at.length > 0,
    );
  }
}
