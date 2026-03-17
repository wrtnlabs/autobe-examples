import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test that edit history list correctly handles pagination when a todo has many edits.
 * 1) Member registers and authenticates using authorize_member_join utility.
 * 2) Member creates a todo using generate_random_todo_app_member_todos_create utility.
 * 3) Member performs 25 edits to create extensive history by calling update endpoint in a loop.
 * 4) Member retrieves first page of edit history with page=1, limit=10.
 * 5) Member retrieves second page with page=2, limit=10.
 * Validations: Verify pagination metadata, entry counts, chronological order, no duplicates, and proper field structure.
 */
export async function test_api_todo_edit_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Perform 25 edits to create extensive history
  const editCount = 25;
  for (let i = 0; i < editCount; i++) {
    const updatedTodo = await api.functional.todoApp.member.todos.update(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          title: `Updated Title ${i + 1} - ${RandomGenerator.name()}`,
          description: `Updated description ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
          started_at: i % 3 === 0 ? new Date().toISOString() : null,
          due_at:
            i % 2 === 0
              ? new Date(Date.now() + 86400000 * (i + 1)).toISOString()
              : null,
        } satisfies ITodoAppTodo.IUpdate,
      },
    );
    typia.assert(updatedTodo);
  }
  // 4. Retrieve first page of edit history (page=1, limit=10)
  const firstPage =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(firstPage);
  // 5. Retrieve second page of edit history (page=2, limit=10)
  const secondPage =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 2,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page records", firstPage.pagination.records, 25);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 3);
  TestValidator.equals("first page data length", firstPage.data.length, 10);
  // Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 3);
  TestValidator.equals("second page data length", secondPage.data.length, 10);
  // Validate chronological order (most recent first) within each page
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].created_at).getTime();
    const next = new Date(firstPage.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `first page order ${i} -> ${i + 1}`,
      current >= next,
    );
  }
  for (let i = 0; i < secondPage.data.length - 1; i++) {
    const current = new Date(secondPage.data[i].created_at).getTime();
    const next = new Date(secondPage.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `second page order ${i} -> ${i + 1}`,
      current >= next,
    );
  }
  // Validate no duplicate entry IDs across pages
  const firstPageIds = new Set(firstPage.data.map((entry) => entry.id));
  const secondPageIds = new Set(secondPage.data.map((entry) => entry.id));
  for (const id of secondPageIds) {
    TestValidator.predicate(`no duplicate id ${id}`, !firstPageIds.has(id));
  }
  // Validate all entries have proper structure
  for (const entry of firstPage.data) {
    TestValidator.predicate("entry has id", entry.id !== undefined);
    TestValidator.predicate(
      "entry has created_at",
      entry.created_at !== undefined,
    );
    TestValidator.predicate(
      "entry has todo reference",
      entry.todo !== undefined,
    );
    TestValidator.predicate("entry todo has id", entry.todo.id !== undefined);
    TestValidator.predicate(
      "entry todo has title",
      entry.todo.title !== undefined,
    );
  }
  for (const entry of secondPage.data) {
    TestValidator.predicate("entry has id", entry.id !== undefined);
    TestValidator.predicate(
      "entry has created_at",
      entry.created_at !== undefined,
    );
    TestValidator.predicate(
      "entry has todo reference",
      entry.todo !== undefined,
    );
    TestValidator.predicate("entry todo has id", entry.todo.id !== undefined);
    TestValidator.predicate(
      "entry todo has title",
      entry.todo.title !== undefined,
    );
  }
  // Validate that entries have null for unchanged fields (at least some should be null)
  const hasNullFields = firstPage.data.some(
    (entry) =>
      entry.title === null ||
      entry.description === null ||
      entry.started_at === null ||
      entry.due_at === null ||
      entry.completed === null,
  );
  TestValidator.predicate("some entries have null fields", hasNullFields);
}
