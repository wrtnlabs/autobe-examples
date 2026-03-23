import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_trash_listing_with_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string>() satisfies string & tags.Format<"email"> as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies ITodoAppMemberSession.IJoin,
  });
  memberConnection.headers = { Authorization: auth.token.access };
  // 2. Create multiple todos with various date configurations
  const todos: ITodoAppTodo[] = [];
  // Todo 1: With start and due dates
  const todo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with dates",
        description: "Has start and due dates",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  todos.push(todo1);
  // Todo 2: With only start date
  const todo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with start date",
        description: "Has only start date",
        start_date: new Date(Date.now() - 86400000).toISOString(), // -1 day
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  todos.push(todo2);
  // Todo 3: With only due date
  const todo3 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with due date",
        description: "Has only due date",
        due_date: new Date(Date.now() + 172800000).toISOString(), // +2 days
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  todos.push(todo3);
  // Todo 4: No dates
  const todo4 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo without dates",
        description: "No date fields",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  todos.push(todo4);
  // 3. Delete all todos to move them to trash
  for (const todo of todos) {
    await api.functional.todoApp.member.todos.erase(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. Test sorting options
  // Test sorting by creation date (newest first)
  const newFirst = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(newFirst);
  TestValidator.equals(
    "newest first order",
    newFirst.data.map((t) => t.id),
    [todo4.id, todo3.id, todo2.id, todo1.id],
  );
  // Test sorting by creation date (oldest first)
  const oldFirst = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(oldFirst);
  TestValidator.equals(
    "oldest first order",
    oldFirst.data.map((t) => t.id),
    [todo1.id, todo2.id, todo3.id, todo4.id],
  );
  // Test sorting by start date (earliest first)
  const startEarliest = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startEarliest);
  // Todos without start date should appear at the end
  TestValidator.equals(
    "start date earliest first",
    startEarliest.data.map((t) => t.id),
    [todo2.id, todo1.id, todo3.id, todo4.id],
  );
  // Test sorting by start date (latest first)
  const startLatest = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startLatest);
  TestValidator.equals(
    "start date latest first",
    startLatest.data.map((t) => t.id),
    [todo1.id, todo2.id, todo3.id, todo4.id],
  );
  // Test sorting by due date (earliest first)
  const dueEarliest = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "dueAt",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueEarliest);
  // Todos without due date should appear at the end
  TestValidator.equals(
    "due date earliest first",
    dueEarliest.data.map((t) => t.id),
    [todo1.id, todo3.id, todo2.id, todo4.id],
  );
  // Test sorting by due date (latest first)
  const dueLatest = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "dueAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueLatest);
  TestValidator.equals(
    "due date latest first",
    dueLatest.data.map((t) => t.id),
    [todo3.id, todo1.id, todo2.id, todo4.id],
  );
  // 5. Test pagination with sorting
  const paginated = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        direction: "desc",
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals("pagination count", paginated.data.length, 2);
  TestValidator.equals(
    "pagination first page",
    paginated.data.map((t) => t.id),
    [todo4.id, todo3.id],
  );
}