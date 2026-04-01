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

export async function test_api_todo_update_creates_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo with title and description
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      },
    },
  );
  typia.assert(todo);
  // Verify initial todo has no edit history (initial creation doesn't create history)
  TestValidator.equals(
    "initial edit history empty",
    todo.editHistories.length,
    0,
  );
  // 3. Update the todo title
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify edit history was created
  TestValidator.predicate(
    "edit history created after update",
    () => updatedTodo.editHistories.length >= 1,
  );
  // 5. Get the first history entry (most recent)
  const firstHistoryEntry = typia.assert(updatedTodo.editHistories[0]!);
  // Verify the history entry contains the new title
  TestValidator.equals(
    "history title matches update",
    firstHistoryEntry.title,
    updatedTitle,
  );
  // Verify unchanged fields are null in history entry
  TestValidator.equals(
    "history description is null (unchanged)",
    firstHistoryEntry.description,
    null,
  );
  TestValidator.equals(
    "history started_at is null (unchanged)",
    firstHistoryEntry.started_at,
    null,
  );
  TestValidator.equals(
    "history due_at is null (unchanged)",
    firstHistoryEntry.due_at,
    null,
  );
  // 6. Perform a second update changing the description
  const secondUpdatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const secondUpdatedTodo =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        description: secondUpdatedDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(secondUpdatedTodo);
  // 7. Verify a second history entry was created
  TestValidator.equals(
    "two history entries after second update",
    secondUpdatedTodo.editHistories.length,
    2,
  );
  // Get the second history entry (most recent)
  const secondHistoryEntry = typia.assert(secondUpdatedTodo.editHistories[0]!);
  // Verify the second history entry contains the new description
  TestValidator.equals(
    "second history description matches update",
    secondHistoryEntry.description,
    secondUpdatedDescription,
  );
  // Verify unchanged fields are null in second history entry
  TestValidator.equals(
    "second history title is null (unchanged)",
    secondHistoryEntry.title,
    null,
  );
  TestValidator.equals(
    "second history started_at is null (unchanged)",
    secondHistoryEntry.started_at,
    null,
  );
  TestValidator.equals(
    "second history due_at is null (unchanged)",
    secondHistoryEntry.due_at,
    null,
  );
  // 8. Verify first history entry still has the title update
  const firstHistoryEntryAfterSecondUpdate = typia.assert(
    secondUpdatedTodo.editHistories[1]!,
  );
  TestValidator.equals(
    "first history still has title update",
    firstHistoryEntryAfterSecondUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "first history description still null",
    firstHistoryEntryAfterSecondUpdate.description,
    null,
  );
  // Verify timestamps are in correct order (most recent first)
  TestValidator.predicate(
    "history entries sorted by created_at descending",
    () => {
      const olderEntryTime = new Date(
        firstHistoryEntryAfterSecondUpdate.created_at,
      ).getTime();
      const newerEntryTime = new Date(secondHistoryEntry.created_at).getTime();
      return newerEntryTime >= olderEntryTime;
    },
  );
}
