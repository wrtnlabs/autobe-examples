import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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
 * Permanently deletes a trashed member todo using the private member surface.
 *
 * This test exercises the full deletion lifecycle that is actually available in the provided SDK surface: a member joins, creates a private todo, moves it to trash, and permanently deletes it. The scenario validates that the final delete operation succeeds on an owned todo and that the request is executed through an isolated member-specific connection rather than the base connection.
 *
 * Because no read, update, or history retrieval endpoints are available in the provided test surface, the implementation focuses on the supported mutation flow only. This still verifies the critical business rule that a trashed todo can be permanently removed by its owner.
 *
 * 1. Authenticate a private member account using an isolated connection.
 * 2. Create a new todo owned by that member with valid title and optional fields.
 * 3. Move the todo to trash.
 * 4. Permanently delete the trashed todo.
 */
export async function test_api_todo_permanent_delete_removes_history_and_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  await api.functional.todoApp.member.todos.permanent_delete.erase(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
}
