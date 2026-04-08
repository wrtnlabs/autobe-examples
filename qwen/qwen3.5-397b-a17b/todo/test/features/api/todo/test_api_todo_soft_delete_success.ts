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
 * Test the primary success path for todo soft deletion.
 *
 * Validates the core soft-delete workflow including member authentication, todo creation, and soft deletion via the erase endpoint. Ensures that the delete operation completes successfully without throwing errors.
 *
 * The test verifies the fundamental business logic: a member can create a todo and then soft-delete it. The erase operation should complete without error, indicating the todo has been marked as deleted and moved to trash.
 *
 * 1. Member authenticates via join with email, password, and display name.
 * 2. Member creates a todo with required title and optional description, start date, and due date.
 * 3. Member soft-deletes the todo using the erase endpoint.
 * 4. Validates that the delete operation completes successfully without error.
 */
export async function test_api_todo_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo is not deleted initially", todo.isDeleted, false);
  TestValidator.equals(
    "todo deleted_at is null initially",
    todo.deletedAt,
    null,
  );
  // 3. Soft-delete the todo - this should complete without error
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
}
