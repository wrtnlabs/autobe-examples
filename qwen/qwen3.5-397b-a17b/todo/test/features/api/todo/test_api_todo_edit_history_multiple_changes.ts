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

export async function test_api_todo_edit_history_multiple_changes(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial todo with title and description
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: null,
        due_at: null,
      },
    },
  );
  typia.assert(initialTodo);
  // Store initial values for validation
  const initialTitle = initialTodo.title;
  const initialDescription = initialTodo.description;
  // 3. First edit: Change only the title
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const afterFirstEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: firstEditTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterFirstEdit);
  TestValidator.equals(
    "title changed after first edit",
    afterFirstEdit.title,
    firstEditTitle,
  );
  // 4. Second edit: Change description, started_at, and due_at
  const secondEditDescription = RandomGenerator.content({ paragraphs: 2 });
  const secondEditStartedAt = new Date().toISOString();
  const secondEditDueAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const afterSecondEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: firstEditTitle, // Keep the same title
        description: secondEditDescription,
        started_at: secondEditStartedAt,
        due_at: secondEditDueAt,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterSecondEdit);
  TestValidator.equals(
    "description changed after second edit",
    afterSecondEdit.description,
    secondEditDescription,
  );
  TestValidator.equals(
    "started_at changed after second edit",
    afterSecondEdit.started_at,
    secondEditStartedAt,
  );
  TestValidator.equals(
    "due_at changed after second edit",
    afterSecondEdit.due_at,
    secondEditDueAt,
  );
  // 5. Third edit: Change only started_at and due_at
  const thirdEditStartedAt = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day from now
  const thirdEditDueAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days from now
  const afterThirdEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: firstEditTitle, // Keep the same title
        description: secondEditDescription, // Keep the same description
        started_at: thirdEditStartedAt,
        due_at: thirdEditDueAt,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterThirdEdit);
  TestValidator.equals(
    "started_at changed after third edit",
    afterThirdEdit.started_at,
    thirdEditStartedAt,
  );
  TestValidator.equals(
    "due_at changed after third edit",
    afterThirdEdit.due_at,
    thirdEditDueAt,
  );
  // 6. Retrieve edit history list
  const editHistoryResponse =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: initialTodo.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryResponse);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "total records",
    editHistoryResponse.pagination.records,
    3,
  );
  TestValidator.equals("total pages", editHistoryResponse.pagination.pages, 1);
  TestValidator.equals(
    "current page",
    editHistoryResponse.pagination.current,
    1,
  );
  // 8. Validate edit history entries count
  TestValidator.equals(
    "edit history entries count",
    editHistoryResponse.data.length,
    3,
  );
  // 9. Validate entries are sorted by created_at descending (most recent first)
  const [firstEntry, secondEntry, thirdEntry] = editHistoryResponse.data;
  TestValidator.predicate(
    "entries sorted descending",
    new Date(firstEntry.created_at).getTime() >=
      new Date(secondEntry.created_at).getTime() &&
      new Date(secondEntry.created_at).getTime() >=
        new Date(thirdEntry.created_at).getTime(),
  );
  // 10. Validate first entry (most recent - third edit): only started_at and due_at should have values
  TestValidator.equals("first entry title null", firstEntry.title, null);
  TestValidator.equals(
    "first entry description null",
    firstEntry.description,
    null,
  );
  TestValidator.equals(
    "first entry started_at matches third edit",
    firstEntry.started_at,
    thirdEditStartedAt,
  );
  TestValidator.equals(
    "first entry due_at matches third edit",
    firstEntry.due_at,
    thirdEditDueAt,
  );
  TestValidator.equals(
    "first entry completed null",
    firstEntry.completed,
    null,
  );
  // 11. Validate second entry (second edit): description, started_at, and due_at should have values
  TestValidator.equals("second entry title null", secondEntry.title, null);
  TestValidator.equals(
    "second entry description matches second edit",
    secondEntry.description,
    secondEditDescription,
  );
  TestValidator.equals(
    "second entry started_at matches second edit",
    secondEntry.started_at,
    secondEditStartedAt,
  );
  TestValidator.equals(
    "second entry due_at matches second edit",
    secondEntry.due_at,
    secondEditDueAt,
  );
  TestValidator.equals(
    "second entry completed null",
    secondEntry.completed,
    null,
  );
  // 12. Validate third entry (oldest - first edit): only title should have value
  TestValidator.equals(
    "third entry title matches first edit",
    thirdEntry.title,
    firstEditTitle,
  );
  TestValidator.equals(
    "third entry description null",
    thirdEntry.description,
    null,
  );
  TestValidator.equals(
    "third entry started_at null",
    thirdEntry.started_at,
    null,
  );
  TestValidator.equals("third entry due_at null", thirdEntry.due_at, null);
  TestValidator.equals(
    "third entry completed null",
    thirdEntry.completed,
    null,
  );
  // 13. Validate todo references in history entries
  TestValidator.equals(
    "first entry todo id",
    firstEntry.todo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "second entry todo id",
    secondEntry.todo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "third entry todo id",
    thirdEntry.todo.id,
    initialTodo.id,
  );
}
