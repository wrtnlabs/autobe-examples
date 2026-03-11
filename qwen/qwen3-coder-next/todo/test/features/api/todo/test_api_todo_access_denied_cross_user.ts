import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_todo_access_denied_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // Member A registration and login
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResponse = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberAResponse);
  // Member B registration and login
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResponse = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberBResponse);
  // Member B creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {},
  );
  typia.assert(todo);
  // Member A attempts to delete member B's todo (should fail with 404)
  await TestValidator.httpError(
    "member A cannot delete member B's todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.erase(memberAConnection, {
        todoId: todo.id,
      });
    },
  );
}