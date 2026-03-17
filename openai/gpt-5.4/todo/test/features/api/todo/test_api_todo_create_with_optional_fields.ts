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

export async function test_api_todo_create_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/todos/new" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://example.com/todos" satisfies string as string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const startDate = new Date(
    Date.now() + 60000,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const dueDate = new Date(
    Date.now() + 86400000,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startDate,
    dueDate,
  } satisfies ITodoAppTodo.ICreate;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(todo);
  TestValidator.equals("title matches input", todo.title, body.title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "start date matches input",
    todo.start_date,
    body.startDate ?? null,
  );
  TestValidator.equals(
    "due date matches input",
    todo.due_date,
    body.dueDate ?? null,
  );
  TestValidator.equals("new todo is incomplete", todo.completed, false);
  TestValidator.equals("completed_at starts null", todo.completed_at, null);
  TestValidator.equals("deleted_at starts null", todo.deleted_at, null);
  TestValidator.predicate("created_at is present", todo.created_at.length > 0);
  TestValidator.predicate("updated_at is present", todo.updated_at.length > 0);
}
