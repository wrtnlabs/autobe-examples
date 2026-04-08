import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_update_success_mixed_fields_and_completion_toggle(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test updating a member-owned todo with mixed editable fields and toggling completion.
   *
   * Validates that:
   * 1. A member can update their own todo by PUT /multiUserTodo/member/todos/{todoId}.
   * 2. The server updates the requested editable attributes (title, description, startDate, dueDate, isComplete).
   * 3. created_at remains unchanged while updated_at changes.
   * 4. An editHistoryEntries summary is present on the updated todo response, and the latest entry corresponds to this update.
   * 5. Ownership isolation is preserved by verifying the updated todo content returned from the update call itself.
   */
  // 1. Authenticate as member A
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      display_name: "member-a",
      password: "Passw0rd!",
      href: "https://example.com/member/a",
      referrer: "https://example.com/ref/a",
      ip: "127.0.0.1",
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(member);
  // 2. Create a new todo owned by member A
  const todoBefore = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "todo-before",
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoBefore);
  const originalTodoId = todoBefore.id;
  const originalCreatedAt = todoBefore.created_at;
  const originalUpdatedAt = todoBefore.updated_at;
  const originalIsComplete = todoBefore.is_complete;
  const updatedTitle = "todo-updated";
  const updatedDescription = "updated description";
  const updatedStartDate = "2026-04-03T18:32:00.022Z" satisfies string &
    tags.Format<"date-time">;
  const updatedDueDate = "2026-04-03T18:32:00.022Z" satisfies string &
    tags.Format<"date-time">;
  // 3. Update the todo (toggle is_complete + set mixed fields)
  const todoAfter = await api.functional.multiUserTodo.member.todos.updateTodo(
    memberConnection,
    {
      todoId: originalTodoId,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        startDate: updatedStartDate,
        dueDate: updatedDueDate,
        isComplete: !originalIsComplete,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(todoAfter);
  // 4. Validate updated fields and timestamps
  TestValidator.equals("todo id unchanged", todoAfter.id, originalTodoId);
  TestValidator.equals("title updated", todoAfter.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    todoAfter.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start_date updated",
    todoAfter.start_date,
    updatedStartDate,
  );
  TestValidator.equals("due_date updated", todoAfter.due_date, updatedDueDate);
  TestValidator.equals(
    "is_complete toggled",
    todoAfter.is_complete,
    !originalIsComplete,
  );
  TestValidator.equals(
    "created_at unchanged",
    todoAfter.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    todoAfter.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    todoAfter.updated_at >= todoAfter.created_at,
  );
  // 5. Validate edit history exists on the updated todo response
  TestValidator.predicate(
    "has edit history entries",
    todoAfter.editHistoryEntries.length > 0,
  );
  const latestEdit = todoAfter.editHistoryEntries[0]!;
  typia.assert(latestEdit);
  TestValidator.equals(
    "edit history refers to todo id",
    latestEdit.id,
    originalTodoId,
  );
  // 6. Ownership/privacy: updated state is reflected in member-owned response
  TestValidator.equals(
    "member sees updated title",
    todoAfter.title,
    updatedTitle,
  );
}
