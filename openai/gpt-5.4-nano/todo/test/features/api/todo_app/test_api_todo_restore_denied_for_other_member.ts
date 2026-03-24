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

export async function test_api_todo_restore_denied_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: { title: RandomGenerator.name(3) } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberATodo);
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: memberATodo.id,
  });
  await TestValidator.error("restore denied for other member", async () => {
    await api.functional.todoApp.member.todos.restore.restoreTodo(
      memberBConnection,
      { todoId: memberATodo.id },
    );
  });
  const restoredByA =
    await api.functional.todoApp.member.todos.restore.restoreTodo(
      memberAConnection,
      { todoId: memberATodo.id },
    );
  typia.assert(restoredByA);
  TestValidator.equals(
    "restored todo id matches",
    restoredByA.id,
    memberATodo.id,
  );
  await TestValidator.error(
    "other member cannot restore even after owner restored",
    async () => {
      await api.functional.todoApp.member.todos.restore.restoreTodo(
        memberBConnection,
        { todoId: memberATodo.id },
      );
    },
  );
}
