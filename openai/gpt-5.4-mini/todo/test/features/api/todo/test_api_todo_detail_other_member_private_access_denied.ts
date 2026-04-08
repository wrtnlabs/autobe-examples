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
 * Denies private todo detail access from another member session.
 *
 * This test validates the ownership boundary on the single-todo detail endpoint by creating a todo under member A, then requesting that same todo from member B. The expected behavior is a not-found style rejection so the API does not reveal whether the todo exists, who owns it, or any of its fields to a different member.
 *
 * 1. Register member A and create a private todo owned by member A.
 * 2. Register member B as an independent authenticated session.
 * 3. Request member A's todo detail using member B's session.
 * 4. Verify the endpoint responds with a not-found style HTTP error instead of exposing private data.
 */
export async function test_api_todo_detail_other_member_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  await TestValidator.httpError(
    "cross-member todo detail access should be denied as not found",
    [404],
    async () => {
      await api.functional.todoApp.member.todos.at(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
