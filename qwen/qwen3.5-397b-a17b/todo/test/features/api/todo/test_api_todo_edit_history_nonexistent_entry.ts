import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test retrieving non-existent edit history entries with proper 404 error handling.
 *
 * Validates that the system correctly returns 404 Not Found errors when attempting to retrieve edit history entries that don't exist. This includes two scenarios: requesting a history entry with an invalid historyId for an existing todo, and requesting a history entry with an invalid todoId.
 *
 * 1. Register a new member account via authorize_member_join utility.
 * 2. Create a todo for the member using generate_random_todo_app_member_todos_create.
 * 3. Generate a valid UUID format for a non-existent historyId.
 * 4. Attempt to retrieve the non-existent history entry - validate 404 error.
 * 5. Generate a valid UUID format for a non-existent todoId.
 * 6. Attempt to retrieve a history entry with non-existent todoId - validate 404 error.
 *
 * This ensures proper error handling without leaking information about resource existence.
 */
export async function test_api_todo_edit_history_nonexistent_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo for the member
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3-4. Test non-existent historyId with valid todoId - should return 404
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent history entry", async () => {
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: nonExistentHistoryId,
      },
    );
  });
  // 5-6. Test non-existent todoId - should return 404
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent todo", async () => {
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: nonExistentTodoId,
        historyId: nonExistentHistoryId,
      },
    );
  });
}
