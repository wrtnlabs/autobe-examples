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

export async function test_api_todo_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create initial todo with some values
  const now = new Date();
  const initialStartDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const initialDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description for the todo",
        startDate: initialStartDate.toISOString(),
        dueDate: initialDueDate.toISOString(),
      },
    },
  );
  typia.assert(initialTodo);
  // Store original values for comparison
  const originalUpdatedAt = initialTodo.updated_at;
  const originalTitle = initialTodo.title;
  const originalDescription = initialTodo.description;
  const originalStartDate = initialTodo.start_date;
  const originalDueDate = initialTodo.due_date;
  const originalCompleted = initialTodo.completed;
  const initialHistoryCount = initialTodo.editHistories_count;
  // 3. Update all fields in a single request
  const newStartDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const newDueDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: "Updated Todo Title",
        description: "Updated description with new content",
        start_date: newStartDate.toISOString(),
        due_date: newDueDate.toISOString(),
      },
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify all fields are updated correctly
  TestValidator.equals(
    "title updated",
    updatedTodo.title,
    "Updated Todo Title",
  );
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    "Updated description with new content",
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    newDueDate.toISOString(),
  );
  // 5. Verify updated_at timestamp is changed
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedTodo.updated_at !== originalUpdatedAt,
  );
  // 6. Verify completed status remains unchanged
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo.completed,
    originalCompleted,
  );
  TestValidator.predicate(
    "completed is false by default",
    originalCompleted === false,
  );
  // 7. Validate edit history is created
  TestValidator.predicate(
    "edit history count increased",
    updatedTodo.editHistories_count === initialHistoryCount + 1,
  );
  // Find the latest history entry
  const latestHistory =
    updatedTodo.editHistories[updatedTodo.editHistories.length - 1];
  typia.assert(latestHistory);
  // Verify history records the changes
  TestValidator.equals(
    "old title recorded in history",
    latestHistory.old_title,
    originalTitle,
  );
  TestValidator.equals(
    "new title recorded in history",
    latestHistory.new_title,
    "Updated Todo Title",
  );
  TestValidator.equals(
    "old description recorded in history",
    latestHistory.old_description,
    originalDescription,
  );
  TestValidator.equals(
    "new description recorded in history",
    latestHistory.new_description,
    "Updated description with new content",
  );
  TestValidator.equals(
    "old start_date recorded in history",
    latestHistory.old_start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "new start_date recorded in history",
    latestHistory.new_start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "old due_date recorded in history",
    latestHistory.old_due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "new due_date recorded in history",
    latestHistory.new_due_date,
    newDueDate.toISOString(),
  );
}
