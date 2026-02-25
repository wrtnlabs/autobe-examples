import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test the retrieval of a specific todo history snapshot to verify audit trail integrity.
 * 1. Authenticate as a user via join operation
 * 2. Create a new todo with title
 * 3. Edit the todo multiple times changing different fields (title, description, due date)
 * 4. Retrieve the history entries and select a specific snapshot
 * 5. Call the target operation to get the specific snapshot
 * 6. Verify it contains the exact todo fields as they existed at that historical moment
 */
export async function test_api_todo_history_snapshot_retrieval_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  const initialTodoState = todo;
  // 3. Perform three distinct edits to generate history
  // Edit 1: Update title
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoAfterFirstEdit = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoAfterFirstEdit);
  // Edit 2: Add description
  const secondEditDescription = RandomGenerator.paragraph({ sentences: 3 });
  const todoAfterSecondEdit = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        description: secondEditDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoAfterSecondEdit);
  // Edit 3: Add due date
  const thirdEditDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoAfterThirdEdit = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        due_date: thirdEditDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoAfterThirdEdit);
  // 4. Retrieve history entries to identify snapshots
  const histories = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  // Verify we have at least 3 history entries (create + 3 edits)
  TestValidator.predicate(
    "should have at least 3 history entries",
    histories.data.length >= 3,
  );
  // Find the second edit history (description update)
  // We expect history entries in descending order: 3rd edit, 2nd edit, 1st edit, create
  const secondEditHistory = histories.data[1];
  typia.assert(secondEditHistory);
  // 5. Get the snapshot associated with this history entry
  const snapshot =
    await api.functional.todoApp.user.todos.histories.snapshots.at(
      userConnection,
      {
        todoId: todo.id,
        historyId: secondEditHistory.id,
        snapshotId: secondEditHistory.id, // Based on schema, snapshotId is likely the same as historyId
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot integrity
  // Verify snapshot matches the todo state after second edit
  TestValidator.equals("snapshot todo id matches", snapshot.todo.id, todo.id);
  TestValidator.equals(
    "snapshot title matches second edit state",
    snapshot.title,
    firstEditTitle,
  );
  // The second edit added description, so snapshot should have description
  TestValidator.equals(
    "snapshot description matches second edit",
    snapshot.description,
    secondEditDescription,
  );
  // Due date should be null (not added until third edit)
  TestValidator.equals(
    "snapshot due date should be null after second edit",
    snapshot.due_date,
    null,
  );
  // Start date should be null (never set)
  TestValidator.equals(
    "snapshot start date should be null",
    snapshot.start_date,
    null,
  );
  // Completion status should be false (todo not completed)
  TestValidator.predicate(
    "snapshot completed_at should be null (not completed)",
    snapshot.completed_at === null,
  );
  // Verify snapshot creation timestamp
  TestValidator.predicate(
    "snapshot_created_at should be valid date",
    snapshot.snapshot_created_at !== null &&
      !isNaN(new Date(snapshot.snapshot_created_at).getTime()),
  );
  // Verify snapshot belongs to the correct history entry
  TestValidator.equals(
    "snapshot id matches history entry",
    snapshot.snapshot.id,
    secondEditHistory.id,
  );
}
