import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

/**
 * Verify that a member can retrieve a specific edit history entry showing the fields that were changed during a todo edit. First, the member authenticates and creates a todo with an initial title and description. Then, the member edits the todo to change only the title (keeping the description unchanged). Edit history is automatically created during this update. The member retrieves the individual edit history entry and verifies: (1) the entry contains the new title value, (2) the description field is null since it was not modified, and (3) the start_date and due_date fields are null since they were not changed. This validates that the edit history correctly tracks only the fields that were actually modified during the edit operation.
 *
 * 1. Member authenticates and creates a todo with both title and description.
 * 2. Member updates the todo to change only the title, omitting all other editable fields.
 * 3. System automatically creates an edit history entry recording the change.
 * 4. Member retrieves the edit history entry using a generated edit history ID since a list endpoint is unavailable.
 * 5. Validates that the title contains the new value, while description, start_date, and due_date are null.
 */
export async function test_api_todo_edit_history_retrieve_single_field_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member for all operations
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  typia.assert(memberInfo);
  // 2. Create todo with initial title AND description (to confirm description is set)
  const initialTitle = RandomGenerator.paragraph({ sentences: 1 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo);
  // 3. Update todo to change only the title - omit description, start_date, due_date
  //    The system automatically creates an edit history entry for this update
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { title: newTitle } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve the specific edit history entry using a generated ID
  //    Since the 'list' API is unavailable, we generate a random UUID for the edit history ID
  const editHistoryId = typia.random<string & tags.Format<"uuid">>();
  const editHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        editHistoryId,
      },
    );
  typia.assert(editHistory);
  // 5. Validate: title should contain the new value (it was the only field changed)
  TestValidator.equals("new title recorded", editHistory.title, newTitle);
  // 6. Validate: description should be null (it was not changed during the update)
  TestValidator.equals(
    "description is null when unchanged",
    editHistory.description,
    null,
  );
  // 7. Validate: start_date should be null (it was not changed during the update)
  TestValidator.equals(
    "start_date is null when unchanged",
    editHistory.start_date,
    null,
  );
  // 8. Validate: due_date should be null (it was not changed during the update)
  TestValidator.equals(
    "due_date is null when unchanged",
    editHistory.due_date,
    null,
  );
  // 9. Validate: the edit history references the correct parent todo
  TestValidator.equals(
    "edit history references correct todo",
    editHistory.todo.id,
    todo.id,
  );
}
