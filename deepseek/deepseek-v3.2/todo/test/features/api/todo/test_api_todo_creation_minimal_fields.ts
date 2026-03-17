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

export async function test_api_todo_creation_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Create todo with minimal required field (title only)
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(todo);
  // Validate basic todo properties
  TestValidator.equals("title matches input", todo.title, createBody.title);
  // Validate completion status default (should be false)
  TestValidator.equals("completion status default", todo.completed, false);
  // Validate optional fields are null
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  // Validate member association
  TestValidator.equals(
    "todo belongs to authenticated member",
    todo.member.id,
    member.id,
  );
  TestValidator.equals("member email matches", todo.member.email, member.email);
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    member.display_name,
  );
}
