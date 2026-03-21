import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_edit_history_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with title 'Original Title'
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Original Title",
      },
    },
  );
  typia.assert(todo);
  // 3. Update the todo's title to 'Updated Title' to create edit history
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title",
      },
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve the edit history entry
  // The historyId is in the editHistories array of the updated todo
  const historyId = updatedTodo.editHistories[0]?.id;
  TestValidator.equals("history exists", historyId !== undefined, true);
  const historyEntry =
    await api.functional.multiUserTodo.member.todos.history.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: historyId!,
      },
    );
  typia.assert(historyEntry);
  // 5. Validate the history entry
  TestValidator.equals(
    "history belongs to correct todo",
    historyEntry.todo.id,
    todo.id,
  );
  TestValidator.equals(
    "old_title is 'Original Title'",
    historyEntry.old_title,
    "Original Title",
  );
  TestValidator.equals(
    "new_title is 'Updated Title'",
    historyEntry.new_title,
    "Updated Title",
  );
  TestValidator.predicate(
    "created_at is present",
    historyEntry.created_at !== undefined,
  );
  TestValidator.equals(
    "description fields are null (not modified)",
    historyEntry.old_description,
    null,
  );
  TestValidator.equals(
    "description fields are null (not modified)",
    historyEntry.new_description,
    null,
  );
  TestValidator.equals(
    "start_date fields are null (not modified)",
    historyEntry.old_start_date,
    null,
  );
  TestValidator.equals(
    "start_date fields are null (not modified)",
    historyEntry.new_start_date,
    null,
  );
  TestValidator.equals(
    "due_date fields are null (not modified)",
    historyEntry.old_due_date,
    null,
  );
  TestValidator.equals(
    "due_date fields are null (not modified)",
    historyEntry.new_due_date,
    null,
  );
}
