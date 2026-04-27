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

export async function test_api_todo_soft_delete_already_trashed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: `http://${RandomGenerator.alphabets(8)}.com`,
      referrer: `http://${RandomGenerator.alphabets(8)}.com`,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. First soft-delete should succeed
  await api.functional.todoApp.member.todos.eraseByTodoid(memberConnection, {
    todoId: todo.id,
  });
  // 4. Second soft-delete on the same todo should be rejected (already trashed)
  await TestValidator.error(
    "soft-delete already trashed todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.eraseByTodoid(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
