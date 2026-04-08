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
 * Test that an authenticated member cannot retrieve todo items owned by another member.
 *
 * Validates the data isolation and privacy requirements of the todo application by ensuring that members can only access their own todo items. The test creates two separate member accounts, has one member create a todo, then attempts to access that todo using the other member's authentication credentials.
 *
 * This test verifies that the API properly enforces ownership checks and returns appropriate error responses when unauthorized access is attempted.
 *
 * 1. Register and authenticate first member who will attempt unauthorized access.
 * 2. Register and authenticate second member who will own the todo.
 * 3. Second member creates a todo item with title and optional fields.
 * 4. First member attempts to retrieve the todo owned by second member.
 * 5. Validate that the API rejects the request with an appropriate error.
 */
export async function test_api_todo_detail_retrieve_another_member_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first member (attacker)
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Register and authenticate second member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Owner creates a todo item
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 4. Attacker attempts to retrieve owner's todo
  await TestValidator.error(
    "unauthorized access to another member's todo",
    async () => {
      await api.functional.todoApp.member.todos.at(attackerConnection, {
        todoId: todo.id,
      });
    },
  );
}
