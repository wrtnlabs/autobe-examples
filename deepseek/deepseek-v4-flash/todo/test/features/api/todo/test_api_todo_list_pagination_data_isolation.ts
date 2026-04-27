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

export async function test_api_todo_list_pagination_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member 1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create 5 todos for Member 1
  const todos = await ArrayUtil.asyncRepeat(5, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      member1Connection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  const todoIds = todos.map((t) => t.id);
  // 3. Test pagination page 1 with limit 3
  const page1 = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 data length", page1.data.length, 3);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 3);
  TestValidator.equals(
    "page 1 pagination records",
    page1.pagination.records,
    5,
  );
  TestValidator.equals("page 1 pagination pages", page1.pagination.pages, 2);
  // 4. Test pagination page 2 with limit 3
  const page2 = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 data length", page2.data.length, 2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 3);
  TestValidator.equals(
    "page 2 pagination records",
    page2.pagination.records,
    5,
  );
  TestValidator.equals("page 2 pagination pages", page2.pagination.pages, 2);
  // 5. Verify all created todos appear across both pages
  const pageIds = [...page1.data, ...page2.data].map((t) => t.id);
  for (const id of todoIds) {
    TestValidator.predicate(
      `todo ${id} appears in paginated results`,
      pageIds.includes(id),
    );
  }
  // 6. Setup Member 2 for data isolation test
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456!",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  // 7. Create a todo for Member 2
  const member2Todo = await generate_random_todo_app_member_todos_create(
    member2Connection,
    {},
  );
  typia.assert(member2Todo);
  // 8. As Member 1, fetch all todos and verify data isolation
  const member1AllTodos = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(member1AllTodos);
  // Member 2's todo must NOT appear in Member 1's list
  const found = member1AllTodos.data.find((t) => t.id === member2Todo.id);
  TestValidator.predicate(
    "member 2's todo must not appear in member 1's list",
    found === undefined,
  );
  // All todos in member 1's list must belong to member 1
  for (const todo of member1AllTodos.data) {
    TestValidator.equals("todo owner is member 1", todo.member.id, member1.id);
  }
}
