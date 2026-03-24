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

export async function test_api_todo_view_after_deletion_in_trash_includes_lifecycle_fields(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();

  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies ITodoAppMember.IJoin,
  });

  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: authorized.email,
      password,
      href,
      referrer,
    } satisfies ITodoAppMember.ILogin,
  });

  const created: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(userConnection, {
      body: {
        title: RandomGenerator.name(),
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(created);

  const fetched: ITodoAppTodo = await api.functional.todoApp.member.todos.at(
    userConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(fetched);

  TestValidator.equals("todo id matches", fetched.id, created.id);
  TestValidator.equals("todo title matches", fetched.title, created.title);
  TestValidator.equals(
    "completion status unchanged",
    fetched.completion_status,
    created.completion_status,
  );
  TestValidator.predicate(
    "deleted_in_trash_at is set",
    fetched.deleted_in_trash_at !== null,
  );
  TestValidator.equals("deleted_at remains null", fetched.deleted_at, null);
}
