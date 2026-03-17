import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_trash_list_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create 5 todo items with distinct titles and varying optional fields
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Trash Test Todo A - ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Trash Test Todo B - ${RandomGenerator.alphabets(6)}`,
        description: null,
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Trash Test Todo C - ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        started_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(todo3);
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Trash Test Todo D - ${RandomGenerator.alphabets(6)}`,
        due_at: new Date(Date.now() + 172800000).toISOString(),
      },
    },
  );
  typia.assert(todo4);
  const todo5 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Trash Test Todo E - ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(todo5);
  // Step 3: Soft-delete 3 of the 5 todos (todo1, todo2, todo3) to move them to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // Step 4: Call the trashed list endpoint with an empty/default request body
  const trashedPage = await api.functional.todoApp.member.todos.trashed.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedPage);
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination.records equals number of trashed todos",
    trashedPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.current is 1 (default page)",
    trashedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit is 20 (default limit)",
    trashedPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "data array has exactly 3 items",
    trashedPage.data.length,
    3,
  );
  // Step 6: Validate each trashed item has a non-null trashed_at
  for (const item of trashedPage.data) {
    TestValidator.predicate("trashed_at is non-null", item.trashed_at !== null);
  }
  // Step 7: Validate that the trashed items' IDs match exactly those deleted
  const trashedIds = new Set(trashedPage.data.map((item) => item.id));
  TestValidator.predicate("todo1 is in trashed list", trashedIds.has(todo1.id));
  TestValidator.predicate("todo2 is in trashed list", trashedIds.has(todo2.id));
  TestValidator.predicate("todo3 is in trashed list", trashedIds.has(todo3.id));
  // Step 8: Validate that active todos (todo4, todo5) do NOT appear in the trashed list
  TestValidator.predicate(
    "todo4 (active) is NOT in trashed list",
    !trashedIds.has(todo4.id),
  );
  TestValidator.predicate(
    "todo5 (active) is NOT in trashed list",
    !trashedIds.has(todo5.id),
  );
  // Step 9: Validate titles match the soft-deleted todos
  const trashedTitles = new Set(trashedPage.data.map((item) => item.title));
  TestValidator.predicate(
    "todo1 title appears in trashed data",
    trashedTitles.has(todo1.title),
  );
  TestValidator.predicate(
    "todo2 title appears in trashed data",
    trashedTitles.has(todo2.title),
  );
  TestValidator.predicate(
    "todo3 title appears in trashed data",
    trashedTitles.has(todo3.title),
  );
}
