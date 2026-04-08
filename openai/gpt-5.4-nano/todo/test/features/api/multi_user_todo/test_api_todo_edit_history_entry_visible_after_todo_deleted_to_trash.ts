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

export async function test_api_todo_edit_history_entry_visible_after_todo_deleted_to_trash(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a todo owner can still view an edit-history entry after the todo
   * is moved into trash.
   *
   * This validates the full workflow:
   * 1. Create an authenticated member.
   * 2. Create a member-owned todo.
   * 3. Update the todo once to generate an immutable edit history entry and
   *    capture its identifiers and change payload.
   * 4. Move the todo into trash.
   * 5. Fetch the specific edit-history entry while the todo is in trash and
   *    confirm it matches the originally generated edit event.
   *
   * Business rule: transitioning the todo lifecycle from normal into trash
   * must not block the owner from accessing edit history for that todo.
   */
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  // Use an authorized connection for subsequent authenticated calls.
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: memberConnection.headers,
  };
  TestValidator.predicate(
    "member authorization token access should be non-empty",
    () => memberAuth.token.access.length > 0,
  );
  // 2) Create a todo owned by that member.
  const createTodoBody = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    startDate: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 10,
    ).toISOString(),
    dueDate: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 20,
    ).toISOString(),
  } satisfies IMultiUserTodoTodo.ICreate;
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    authorizedConnection,
    { body: createTodoBody },
  );
  typia.assert(createdTodo);
  const todoId = createdTodo.id;
  // 3) Perform at least one edit on the todo to generate an edit history entry.
  const updatedTitle1 = RandomGenerator.name();
  const updatedDescription1 = RandomGenerator.paragraph({ sentences: 3 });
  const updatePayload = {
    title: updatedTitle1,
    description: updatedDescription1,
    startDate: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    dueDate: null,
    isComplete: true,
  } satisfies IMultiUserTodoTodo.IUpdate;
  const updatedTodo =
    await api.functional.multiUserTodo.member.todos.updateTodo(
      authorizedConnection,
      {
        todoId,
        body: updatePayload,
      },
    );
  typia.assert(updatedTodo);
  TestValidator.predicate(
    "editHistoryEntries should contain at least one entry after update",
    () => updatedTodo.editHistoryEntries.length > 0,
  );
  const latestEdit = updatedTodo.editHistoryEntries[0];
  const editHistoryEntryId = latestEdit.id;
  const expectedOwnerId = memberAuth.id;
  // 4) Move the same todo into the trash.
  const moveResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      authorizedConnection,
      {
        body: {
          ids: [
            todoId,
          ] satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest["ids"],
        },
      },
    );
  typia.assert(moveResult);
  TestValidator.equals("movedCount should be 1", moveResult.movedCount, 1);
  // 5) Fetch the specific edit history entry while the todo is in trash.
  const fetchedEdit =
    await api.functional.multiUserTodo.member.todos.edit_history_entries.at(
      authorizedConnection,
      {
        todoId,
        todoEditHistoryEntryId: editHistoryEntryId,
      },
    );
  typia.assert(fetchedEdit);
  // Validations: identifiers and values must match the originally performed edit.
  TestValidator.equals(
    "edit history id matches",
    fetchedEdit.id,
    editHistoryEntryId,
  );
  TestValidator.equals("todoId matches", fetchedEdit.todoId, todoId);
  TestValidator.equals(
    "ownerId matches authenticated member",
    fetchedEdit.ownerId,
    expectedOwnerId,
  );
  TestValidator.equals(
    "previousTitle matches created todo title",
    fetchedEdit.previousTitle,
    createdTodo.title,
  );
  TestValidator.equals(
    "newTitle matches update title",
    fetchedEdit.newTitle,
    updatedTitle1,
  );
  TestValidator.equals(
    "previousDescription matches created todo description",
    fetchedEdit.previousDescription,
    createdTodo.description,
  );
  TestValidator.equals(
    "newDescription matches update description",
    fetchedEdit.newDescription,
    updatedDescription1,
  );
  TestValidator.equals(
    "previousStartDate matches",
    fetchedEdit.previousStartDate,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "newStartDate matches",
    fetchedEdit.newStartDate,
    updatePayload.startDate ?? null,
  );
  TestValidator.equals(
    "previousDueDate matches",
    fetchedEdit.previousDueDate,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "newDueDate matches update null",
    fetchedEdit.newDueDate,
    null,
  );
  TestValidator.equals(
    "previousIsComplete matches created todo",
    fetchedEdit.previousIsComplete,
    createdTodo.is_complete,
  );
  TestValidator.equals(
    "newIsComplete matches update",
    fetchedEdit.newIsComplete,
    updatePayload.isComplete ?? false,
  );
  TestValidator.predicate(
    "editMadeAt is returned",
    () => fetchedEdit.editMadeAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt is returned",
    () => fetchedEdit.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is returned",
    () => fetchedEdit.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is either null or non-empty string",
    () => fetchedEdit.deletedAt === null || fetchedEdit.deletedAt.length > 0,
  );
}
