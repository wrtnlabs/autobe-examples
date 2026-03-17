import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodoEditHistory";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import type { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_edit_history_multiple_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo item
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todo);
  // 3. Perform multiple edits to generate history entries
  // First edit: Update the title
  const firstEditTitle = "Updated Title - First Edit";
  const updatedTodo1 = await api.functional.privateTodoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // Second edit: Add a description
  const secondEditDescription = "This is a detailed description for the todo";
  const updatedTodo2 = await api.functional.privateTodoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: secondEditDescription,
        startDate: null,
        dueDate: null,
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // Third edit: Set start_date and due_date
  const thirdEditStartDate = new Date().toISOString();
  const thirdEditDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedTodo3 = await api.functional.privateTodoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: secondEditDescription,
        startDate: thirdEditStartDate,
        dueDate: thirdEditDueDate,
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo3);
  // 4. Retrieve the edit history
  const editHistory =
    await api.functional.privateTodoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IPrivateTodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // 5. Validate the response
  // Check pagination structure
  TestValidator.predicate(
    "pagination exists",
    editHistory.pagination !== null && editHistory.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(editHistory.data));
  // Check we have at least 3 history entries (one for each edit)
  TestValidator.predicate(
    "has at least 3 history entries",
    editHistory.data.length >= 3,
  );
  // Check entries are sorted by created_at descending (most recent first)
  for (let i = 0; i < editHistory.data.length - 1; i++) {
    const currentCreatedAt = new Date(editHistory.data[i].created_at).getTime();
    const nextCreatedAt = new Date(
      editHistory.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `entries sorted descending at index ${i}`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // Verify the most recent entry (index 0) has the date changes
  const mostRecentEntry = editHistory.data[0];
  TestValidator.equals(
    "most recent entry has start_date",
    mostRecentEntry.start_date !== null,
    true,
  );
  TestValidator.equals(
    "most recent entry has due_date",
    mostRecentEntry.due_date !== null,
    true,
  );
  // Verify the second entry has description but null dates
  const secondEntry = editHistory.data[1];
  TestValidator.equals(
    "second entry has description",
    secondEntry.description !== null,
    true,
  );
  TestValidator.equals(
    "second entry has null start_date",
    secondEntry.start_date,
    null,
  );
  TestValidator.equals(
    "second entry has null due_date",
    secondEntry.due_date,
    null,
  );
  // Verify the third entry has title but null description and dates
  const thirdEntry = editHistory.data[2];
  TestValidator.equals(
    "third entry has title",
    thirdEntry.title !== null,
    true,
  );
  TestValidator.equals(
    "third entry has null description",
    thirdEntry.description,
    null,
  );
  TestValidator.equals(
    "third entry has null start_date",
    thirdEntry.start_date,
    null,
  );
  TestValidator.equals(
    "third entry has null due_date",
    thirdEntry.due_date,
    null,
  );
}
