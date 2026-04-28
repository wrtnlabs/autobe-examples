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
 * Test that a member cannot update a todo owned by another member.
 *
 * Validates strict ownership isolation in the todo system by having two distinct members where one creates a todo and the other attempts to update it. The system must enforce that only the owning member can modify their todos, returning a 404 error when a non-owner attempts an update operation.
 *
 * This test ensures that the ownership check is properly enforced at the API level, preventing unauthorized modifications to another user's todos. The test verifies that the error response matches the expected behavior defined in the API specification.
 *
 * 1. Member A joins the system with unique credentials.
 * 2. Member A creates a todo item.
 * 3. Member B joins the system with different credentials.
 * 4. Member B attempts to update Member A's todo and receives a 404 error.
 */
export async function test_api_todo_update_ownership_enforcement_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Member A joins the system
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Member B joins the system
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 4. Member B attempts to update Member A's todo and receives a 404 error
  await TestValidator.httpError(
    "non-owner cannot update todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.update(memberBConnection, {
        todoId: todo.id,
        body: {
          title: RandomGenerator.name(),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
