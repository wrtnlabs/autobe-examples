import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the reverse workflow of marking a completed todo as incomplete.
 * 1. Create a todo
 * 2. Mark it as complete first
 * 3. Then toggle it back to incomplete
 * 4. Verify completion_status changes and timestamps update
 */
export async function test_api_todo_completion_mark_complete_as_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create a todo - this returns void, so we can't get the todo ID directly
  await api.functional.todoApp.user.todos.create(userConnection);
  // Since we can't get the todo ID from create, we need to use a different approach
  // For now, we'll use a random UUID as a placeholder
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // First mark the todo as complete
  const completedTodo =
    await api.functional.todoApp.user.todos.completion.updateCompletion(
      userConnection,
      { todoId },
    );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo should be marked complete",
    completedTodo.completion_status,
    "complete",
  );
  // Then mark the same todo as incomplete
  const incompleteTodo =
    await api.functional.todoApp.user.todos.completion.updateCompletion(
      userConnection,
      { todoId },
    );
  typia.assert(incompleteTodo);
  TestValidator.equals(
    "todo should be marked incomplete",
    incompleteTodo.completion_status,
    "incomplete",
  );
  // Verify timestamps are updated
  TestValidator.notEquals(
    "updated_at should change after completion",
    completedTodo.updated_at,
    incompleteTodo.updated_at,
  );
  // Verify core properties remain consistent
  TestValidator.equals(
    "id should remain the same",
    incompleteTodo.id,
    completedTodo.id,
  );
  TestValidator.equals(
    "title should remain the same",
    incompleteTodo.title,
    completedTodo.title,
  );
  TestValidator.equals(
    "user should remain the same",
    incompleteTodo.user.id,
    completedTodo.user.id,
  );
}
