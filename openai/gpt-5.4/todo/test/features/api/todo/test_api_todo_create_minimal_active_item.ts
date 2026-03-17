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

export async function test_api_todo_create_minimal_active_item(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined member email matches",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals("joined member is active", authorized.deleted_at, null);
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches input", todo.title, title);
  TestValidator.equals(
    "omitted description defaults to null",
    todo.description,
    null,
  );
  TestValidator.equals(
    "omitted start date defaults to null",
    todo.start_date,
    null,
  );
  TestValidator.equals(
    "omitted due date defaults to null",
    todo.due_date,
    null,
  );
  TestValidator.equals("new todo starts incomplete", todo.completed, false);
  TestValidator.equals(
    "new todo completion timestamp is null",
    todo.completed_at,
    null,
  );
  TestValidator.equals("new todo is active", todo.deleted_at, null);
}
