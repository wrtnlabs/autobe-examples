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

export async function test_api_todo_trash_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create incomplete todos (new todos default to completed: false)
  const incompleteTodo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Task Alpha",
        description: "This is an incomplete task",
      },
    },
  );
  typia.assert(incompleteTodo1);
  const incompleteTodo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Task Beta",
        description: "Another incomplete task",
      },
    },
  );
  typia.assert(incompleteTodo2);
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Search Test Todo One",
        description: "First todo for search testing",
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Search Test Todo Two",
        description: "Second todo for search testing",
      },
    },
  );
  typia.assert(todo2);
  // 3. Soft delete all todos to move them to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  // 4. Test trash list with completed=false filter
  const trashIncomplete = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completed: false,
        deleted: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashIncomplete);
  TestValidator.predicate("trash has items", trashIncomplete.data.length > 0);
  TestValidator.predicate(
    "all filtered items are incomplete",
    trashIncomplete.data.every((todo) => !todo.completed),
  );
  TestValidator.equals(
    "pagination records match filtered count",
    trashIncomplete.pagination.records,
    trashIncomplete.data.length,
  );
  // 5. Test trash list with completed=true filter (returns empty)
  const trashCompleted = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completed: true,
        deleted: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashCompleted);
  TestValidator.equals(
    "completed filter returns empty when no completed todos",
    trashCompleted.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for completed filter",
    trashCompleted.pagination.records,
    0,
  );
  // 6. Test trash list with search parameter
  const trashSearch = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        search: "Search Test Todo One",
        deleted: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashSearch);
  TestValidator.predicate(
    "search returns matching todos",
    trashSearch.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain search term in title",
    trashSearch.data.some((todo) =>
      todo.title.includes("Search Test Todo One"),
    ),
  );
  // 7. Test trash list without completion filter (all deleted todos)
  const trashAll = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        deleted: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashAll);
  TestValidator.equals(
    "all trash count matches total deleted",
    trashAll.data.length,
    4,
  );
  TestValidator.equals(
    "pagination records matches total",
    trashAll.pagination.records,
    4,
  );
}
