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

export async function test_api_todo_restore_non_existent_todo(
  connection: api.IConnection,
): Promise<void> {
  // Setup User A account
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(userA);
  // Setup User B account
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(userB);
  // Case 1: Non-existent todo (404)
  // Attempt to restore a todo using a UUID that doesn't exist
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.restore(userAConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
  // Case 2: Another user's todo (403)
  // First, create a todo for User A
  const userATodo = await api.functional.todoApp.member.todos.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(userATodo);
  // Now attempt to restore User A's todo using User B's session
  await TestValidator.httpError(
    "should return 403 for another user's todo",
    403,
    async () => {
      await api.functional.todoApp.member.todos.restore(userBConnection, {
        todoId: userATodo.id,
      });
    },
  );
}
