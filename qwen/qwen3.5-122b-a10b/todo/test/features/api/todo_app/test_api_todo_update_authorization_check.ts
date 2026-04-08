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
 * Test todo update authorization check to ensure data isolation between members.
 *
 * Validates that only the todo owner can update their own todo tasks. The test creates two separate member accounts, has the first member create a todo, then attempts to update that todo using the second member's authentication. The test verifies that the unauthorized update attempt fails with an appropriate error, ensuring proper ownership validation and data isolation between users.
 *
 * This test ensures the authorization layer correctly prevents cross-user data access and modification. The system must reject any update attempts where the authenticated member does not own the target todo.
 *
 * 1. Register first member account (owner) with random credentials.
 * 2. Create a todo task owned by the first member.
 * 3. Register second member account (attacker) with different credentials.
 * 4. Attempt to update the first member's todo using the second member's authentication.
 * 5. Verify the update fails with authorization error (403 or 404).
 */
export async function test_api_todo_update_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(ownerAuth);
  // 2. Create todo owned by first member
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Register second member (attacker)
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    attackerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(attackerAuth);
  // 4. Attempt unauthorized update - should fail
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.todoApp.member.todos.update(attackerConnection, {
      todoId: todo.id,
      body: {
        title: "Attempted by attacker",
        description: "This should not succeed",
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  // 5. Verify owner can still update their own todo (sanity check)
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(ownerConnection, {
      todoId: todo.id,
      body: {
        title: "Updated by owner",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  TestValidator.equals(
    "title updated by owner",
    updatedTodo.title,
    "Updated by owner",
  );
}
