import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_creation_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with minimal fields
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create user connection with token from join result
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    ...joinConnection.headers,
    Authorization: joinResult.token.access,
  };
  // 3. Create todo with only title field (minimal creation)
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    userConnection,
    {
      body: { title } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate all fields with proper defaults
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description defaults to empty string",
    todo.description,
    "",
  );
  TestValidator.equals("startDate defaults to null", todo.startDate, null);
  TestValidator.equals("dueDate defaults to null", todo.dueDate, null);
  TestValidator.equals(
    "isCompleted defaults to false",
    todo.isCompleted,
    false,
  );
  TestValidator.predicate(
    "has valid uuid id",
    /^[0-9a-f-]{36}$/i.test(todo.id),
  );
  TestValidator.predicate(
    "has valid timestamp createdAt",
    !isNaN(Date.parse(todo.createdAt)),
  );
  TestValidator.predicate(
    "has valid timestamp updatedAt",
    !isNaN(Date.parse(todo.updatedAt)),
  );
  TestValidator.equals("deletedAt defaults to null", todo.deletedAt, null);
  TestValidator.predicate(
    "has user object",
    todo.user !== null && todo.user !== undefined,
  );
  TestValidator.equals(
    "user id matches member id",
    todo.user.id,
    joinResult.id,
  );
}
