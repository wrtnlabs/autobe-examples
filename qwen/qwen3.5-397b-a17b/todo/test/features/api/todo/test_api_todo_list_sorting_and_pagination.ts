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

export async function test_api_todo_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test empty list edge case
  const emptyList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyList);
  TestValidator.equals("empty list data", emptyList.data, []);
  TestValidator.equals("empty list pages", emptyList.pagination.pages, 0);
  TestValidator.equals("empty list records", emptyList.pagination.records, 0);
  // 3. Create 25 todos with varying data for sorting and pagination tests
  const baseDate = new Date();
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 25; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo_${String(i).padStart(2, "0")}_${RandomGenerator.alphabets(5)}`,
          description:
            i % 5 === 0 ? null : RandomGenerator.paragraph({ sentences: 2 }),
          start_date:
            i % 4 === 0
              ? null
              : new Date(baseDate.getTime() + i * 86400000).toISOString(),
          due_date:
            i % 3 === 0
              ? null
              : new Date(
                  baseDate.getTime() + (i + 10) * 86400000,
                ).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 4. Test pagination with limit=10
  const page1 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "DESC",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 count", page1.data.length, 10);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 records", page1.pagination.records, 25);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  const page2 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sort: "created_at",
        direction: "DESC",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 count", page2.data.length, 10);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  const page3 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 3,
        limit: 10,
        sort: "created_at",
        direction: "DESC",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 count", page3.data.length, 5);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  // 5. Test sorting by created_at ASC and DESC
  const createdDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        direction: "DESC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdDesc);
  for (let i = 1; i < createdDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at DESC order ${i}`,
      new Date(createdDesc.data[i - 1].created_at).getTime() >=
        new Date(createdDesc.data[i].created_at).getTime(),
    );
  }
  const createdAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        direction: "ASC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAsc);
  for (let i = 1; i < createdAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at ASC order ${i}`,
      new Date(createdAsc.data[i - 1].created_at).getTime() <=
        new Date(createdAsc.data[i].created_at).getTime(),
    );
  }
  // 6. Test sorting by title ASC and DESC
  const titleAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "title",
        direction: "ASC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(titleAsc);
  for (let i = 1; i < titleAsc.data.length; i++) {
    TestValidator.predicate(
      `title ASC order ${i}`,
      titleAsc.data[i - 1].title.localeCompare(titleAsc.data[i].title) <= 0,
    );
  }
  const titleDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "title",
        direction: "DESC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(titleDesc);
  for (let i = 1; i < titleDesc.data.length; i++) {
    TestValidator.predicate(
      `title DESC order ${i}`,
      titleDesc.data[i - 1].title.localeCompare(titleDesc.data[i].title) >= 0,
    );
  }
  // 7. Test sorting by start_date with null handling (nulls at end)
  const startDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "start_date",
        direction: "DESC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateDesc);
  // Verify nulls are at the end by checking that once we hit a null, all remaining are null
  const firstNullStartIndex = startDateDesc.data.findIndex(
    (t) => t.start_date === null || t.start_date === undefined,
  );
  if (firstNullStartIndex !== -1) {
    const remainingTodos = startDateDesc.data.slice(firstNullStartIndex);
    const allNulls = remainingTodos.every(
      (t) => t.start_date === null || t.start_date === undefined,
    );
    TestValidator.predicate("null start_date at end", allNulls);
  }
  // 8. Test sorting by due_date with null handling (nulls at end)
  const dueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "due_date",
        direction: "DESC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateDesc);
  const firstNullDueIndex = dueDateDesc.data.findIndex(
    (t) => t.due_date === null || t.due_date === undefined,
  );
  if (firstNullDueIndex !== -1) {
    const remainingTodos = dueDateDesc.data.slice(firstNullDueIndex);
    const allNulls = remainingTodos.every(
      (t) => t.due_date === null || t.due_date === undefined,
    );
    TestValidator.predicate("null due_date at end", allNulls);
  }
  // 9. Test sorting by completed status
  const completedAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "completed",
        direction: "ASC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedAsc);
  const completedDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "completed",
        direction: "DESC",
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedDesc);
  // 10. Test title text search filter (partial matching)
  const searchTodo = todos[0];
  const searchQuery = searchTodo.title.substring(0, 8);
  const searchResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: searchQuery,
        limit: 25,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching todos",
    searchResult.data.length > 0,
  );
  for (const todo of searchResult.data) {
    TestValidator.predicate(
      `search result contains "${searchQuery}"`,
      todo.title.includes(searchQuery),
    );
  }
}
