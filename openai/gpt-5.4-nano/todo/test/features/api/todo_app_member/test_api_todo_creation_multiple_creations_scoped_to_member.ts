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

export async function test_api_todo_creation_multiple_creations_scoped_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a member account.
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  // 2) Create two todos with distinct titles.
  const title1 = RandomGenerator.alphabets(12);
  const title2 = RandomGenerator.alphabets(14);
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title1,
        description: null,
        start_date: RandomGenerator.date(
          new Date("2026-03-24T04:55:40.242Z"),
          1000 * 60 * 60 * 24,
        ).toISOString(),
        due_date: RandomGenerator.date(
          new Date("2026-03-24T04:55:40.242Z"),
          1000 * 60 * 60 * 48,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title2,
        description: null,
        start_date: RandomGenerator.date(
          new Date("2026-03-24T04:55:40.242Z"),
          1000 * 60 * 60 * 12,
        ).toISOString(),
        due_date: RandomGenerator.date(
          new Date("2026-03-24T04:55:40.242Z"),
          1000 * 60 * 60 * 72,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // 3) Validate responses.
  TestValidator.notEquals("todo ids should be distinct", todo1.id, todo2.id);
  TestValidator.equals("todo1 title matches request", todo1.title, title1);
  TestValidator.equals("todo2 title matches request", todo2.title, title2);
  TestValidator.equals(
    "todo1 initial completion is incomplete",
    todo1.completion_status,
    false,
  );
  TestValidator.equals(
    "todo2 initial completion is incomplete",
    todo2.completion_status,
    false,
  );
  TestValidator.equals("todo1 deleted_at is null", todo1.deleted_at, null);
  TestValidator.equals(
    "todo1 deleted_in_trash_at is null",
    todo1.deleted_in_trash_at,
    null,
  );
  TestValidator.equals("todo2 deleted_at is null", todo2.deleted_at, null);
  TestValidator.equals(
    "todo2 deleted_in_trash_at is null",
    todo2.deleted_in_trash_at,
    null,
  );
}
