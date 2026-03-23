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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // Create new connection with token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // Step 2: Create todo with all optional fields
  const now = new Date();
  const body = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: new Date(now.getTime() + 86400000).toISOString(),
    due_date: new Date(now.getTime() + 172800000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    authenticatedConnection,
    {
      body: body,
    },
  );
  typia.assert(todo);
  // Step 3: Validate response structure and values
  TestValidator.predicate("todo created", todo !== null);
  TestValidator.equals("title matches input", todo.title, body.title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    body.description,
  );
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    body.start_date,
  );
  TestValidator.equals("due_date matches input", todo.due_date, body.due_date);
  TestValidator.predicate("is_complete is false", todo.is_complete === false);
  TestValidator.predicate("is_trashed is false", todo.is_trashed === false);
  TestValidator.predicate("created_at exists", todo.created_at !== null);
  TestValidator.predicate("updated_at exists", todo.updated_at !== null);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.equals(
    "user id matches member id",
    todo.user.id,
    member.member.id,
  );
  TestValidator.equals(
    "user email matches member email",
    todo.user.email,
    member.member.email,
  );
}