import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test filtering todo items by completion status (all, complete, incomplete).
 *
 * This test verifies that the todo listing API correctly filters todos based
 * on their completion status. It creates incomplete todos and tests three
 * filter scenarios: showing all todos, showing only completed todos (empty),
 * and showing only incomplete todos.
 */
export async function test_api_todo_list_filtering_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create 2 todo items (incomplete by default)
  const todo1 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Verify both todos are incomplete by default
  TestValidator.predicate("todo1 is incomplete", todo1.completed === false);
  TestValidator.predicate("todo2 is incomplete", todo2.completed === false);
  // 3. Test 'all' filter (completed=null)
  const allResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        completed: null,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals(
    "all filter returns 2 todos",
    allResult.pagination.records,
    2,
  );
  TestValidator.equals("all filter data length", allResult.data.length, 2);
  // 4. Test 'incomplete' filter (completed=false)
  const incompleteResult =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        completed: false,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(incompleteResult);
  TestValidator.equals(
    "incomplete filter returns 2 todos",
    incompleteResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "incomplete filter data length",
    incompleteResult.data.length,
    2,
  );
  for (const todo of incompleteResult.data) {
    TestValidator.predicate(
      "all returned todos are incomplete",
      todo.completed === false,
    );
  }
  // 5. Test 'complete' filter (completed=true)
  const completeResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        completed: true,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(completeResult);
  TestValidator.equals(
    "complete filter returns 0 todos",
    completeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter data length",
    completeResult.data.length,
    0,
  );
}
