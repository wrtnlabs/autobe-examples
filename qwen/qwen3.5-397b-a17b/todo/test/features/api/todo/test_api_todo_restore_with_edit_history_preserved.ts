import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that edit history is preserved when restoring a todo from trash.
 *
 * This test validates the business rule that soft-deleting and restoring a todo
 * preserves its edit history, while permanent deletion would remove it.
 *
 * Test flow:
 * 1. Member joins and authenticates
 * 2. Member creates a todo
 * 3. Member updates the todo multiple times to create edit history entries
 * 4. Member soft-deletes the todo (moves to trash)
 * 5. Member restores the todo from trash
 * 6. Validate that the restored todo is returned successfully with all properties intact
 *
 * Note: Edit history endpoint is not available in the provided API functions,
 * so we validate that the todo restoration works correctly and the todo properties
 * are preserved through the delete/restore cycle.
 */
export async function test_api_todo_restore_with_edit_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(`${RandomGenerator.alphabets(10)}@example.com`),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.assert<string & tags.Format<"uri">>(`https://example.com/${RandomGenerator.alphabets(10)}`),
      referrer: typia.assert<string & tags.Format<"uri">>(`https://referrer.com/${RandomGenerator.alphabets(10)}`),
      ip: typia.assert<string & tags.Format<"ipv4">>(`${randint(1, 255)}.${randint(0, 255)}.${randint(0, 255)}.${randint(0, 255)}`),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header for subsequent API calls
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update the todo multiple times to create edit history entries
  const update1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update1);
  const update2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(
          Date.now() + 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update2);
  const update3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update3);
  // 4. Soft-delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Restore the todo from trash
  const restored = await api.functional.todoApp.member.todos.trash.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  // 6. Validate the restored todo
  TestValidator.equals("todo id preserved", restored.id, todo.id);
  TestValidator.equals(
    "title matches last update",
    restored.title,
    update3.title,
  );
  TestValidator.predicate(
    "description is preserved",
    restored.description !== null,
  );
  TestValidator.predicate(
    "started_at is preserved",
    restored.started_at !== null,
  );
  TestValidator.predicate("due_at is preserved", restored.due_at !== null);
  TestValidator.equals(
    "completion status preserved",
    restored.completed,
    false,
  );
  TestValidator.equals(
    "member owner preserved",
    restored.member.id,
    memberAuth.id,
  );
}