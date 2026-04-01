import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_list_completion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create multiple todos (all will be incomplete by default)
  const todos: IMultiUserTodoTodo[] = await ArrayUtil.asyncRepeat(
    5,
    async () =>
      await generate_random_multi_user_todo_member_todos_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMultiUserTodoTodo.ICreate,
        },
      ),
  );
  // 3. Test filter: 'incomplete' - should return all todos (since none are completed)
  const incompleteFilterResult =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        status: "incomplete",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  TestValidator.predicate(
    "incomplete filter returns only incomplete todos",
    () => incompleteFilterResult.data.every((todo) => todo.completed === false),
  );
  TestValidator.equals(
    "incomplete filter total records matches created todos",
    incompleteFilterResult.pagination.records,
    todos.length,
  );
  // 4. Test filter: 'complete' - should return 0 todos (none are completed)
  const completeFilterResult =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        status: "complete",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(completeFilterResult);
  TestValidator.equals(
    "complete filter returns zero todos",
    completeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter data array is empty",
    completeFilterResult.data.length,
    0,
  );
  // 5. Test filter: 'all' - should return all todos
  const allFilterResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(allFilterResult);
  TestValidator.equals(
    "all filter total records",
    allFilterResult.pagination.records,
    todos.length,
  );
  TestValidator.predicate(
    "all filter returns correct number of todos",
    () => allFilterResult.data.length === todos.length,
  );
  // 6. Test no filter (undefined status) - should return all todos
  const noFilterResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(noFilterResult);
  TestValidator.equals(
    "no filter total records",
    noFilterResult.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "no filter matches all filter",
    noFilterResult.pagination.records,
    allFilterResult.pagination.records,
  );
  // 7. Validate pagination metadata for all responses
  TestValidator.predicate(
    "incomplete filter has valid pagination",
    () =>
      incompleteFilterResult.pagination.current >= 1 &&
      incompleteFilterResult.pagination.limit > 0 &&
      incompleteFilterResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "complete filter has valid pagination",
    () =>
      completeFilterResult.pagination.current >= 1 &&
      completeFilterResult.pagination.limit > 0 &&
      completeFilterResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all filter has valid pagination",
    () =>
      allFilterResult.pagination.current >= 1 &&
      allFilterResult.pagination.limit > 0 &&
      allFilterResult.pagination.pages >= 0,
  );
  // 8. Verify each todo in incomplete filter has completed=false
  for (const todo of incompleteFilterResult.data) {
    TestValidator.equals(
      `todo ${todo.id} is incomplete`,
      todo.completed,
      false,
    );
  }
  // 9. Verify each todo in all filter has completed=false (since none are completed)
  for (const todo of allFilterResult.data) {
    TestValidator.equals(
      `todo ${todo.id} is incomplete in all filter`,
      todo.completed,
      false,
    );
  }
}
