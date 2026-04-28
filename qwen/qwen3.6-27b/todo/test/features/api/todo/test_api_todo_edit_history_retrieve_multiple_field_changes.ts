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
 * Verify retrieval of an edit history entry recording multiple field changes in a single update operation.
 *
 * Validates the complete workflow of creating a minimal todo, performing a multi-field edit, and retrieving the resulting edit history entry. When a todo is updated with changes to multiple fields simultaneously (title, description, start date, and due date), the system creates a single edit history record capturing all the new values for the modified fields. Non-modified fields and system-managed fields are returned as null in the history entry.
 *
 * This test focuses on confirming that the edit history correctly captures the new values of all fields changed during a single update, ensuring the change tracking mechanism works for compound edits rather than just single-field modifications.
 *
 * 1. Member registers and authenticates to establish an authorized session.
 * 2. Member creates a minimal todo containing only a title (no description or dates).
 * 3. Member updates the todo with a new title, a description, and both start and due dates.
 * 4. Member retrieves the individual edit history entry created by the update.
 * 5. Validates that the edit history entry contains the new title, description, start_date, and due_date values from the update.
 */
export async function test_api_todo_edit_history_retrieve_multiple_field_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a todo with only a title (no description or scheduling dates)
  const todoCreated = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoCreated);
  // 3. Update the todo with multiple field changes: new title, description, start_date, due_date
  const startDate = RandomGenerator.date(
    new Date(),
    86400000 * 30,
  ).toISOString();
  const dueDate = RandomGenerator.date(new Date(), 86400000 * 60).toISOString();
  const todoUpdated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todoCreated.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: startDate,
        due_date: dueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoUpdated);
  // 4. Retrieve the edit history entry
  const editHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todoCreated.id,
        editHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(editHistory);
  // 5. Validate that all four changed fields are recorded in the edit history entry
  TestValidator.predicate(
    "title recorded in history",
    editHistory.title !== null,
  );
  if (editHistory.title !== null) {
    TestValidator.equals(
      "title matches updated value",
      editHistory.title,
      todoUpdated.title,
    );
  }
  TestValidator.predicate(
    "description recorded in history",
    editHistory.description !== null,
  );
  if (editHistory.description !== null) {
    TestValidator.equals(
      "description matches updated value",
      editHistory.description,
      todoUpdated.description,
    );
  }
  TestValidator.predicate(
    "start_date recorded in history",
    editHistory.start_date !== null,
  );
  if (editHistory.start_date !== null) {
    TestValidator.equals(
      "start_date matches",
      editHistory.start_date,
      startDate,
    );
  }
  TestValidator.predicate(
    "due_date recorded in history",
    editHistory.due_date !== null,
  );
  if (editHistory.due_date !== null) {
    TestValidator.equals("due_date matches", editHistory.due_date, dueDate);
  }
}
