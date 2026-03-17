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

export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo with only the required title field
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate business logic (not types - typia.assert already validated types)
  // Validate title matches input
  TestValidator.equals("title matches input", todo.title, todoTitle);
  // Validate optional fields are null
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("started_at is null", todo.started_at, null);
  TestValidator.equals("due_at is null", todo.due_at, null);
  // Validate completed is false by default
  TestValidator.predicate(
    "completed is false by default",
    todo.completed === false,
  );
  // Validate member relation
  TestValidator.equals("member id matches auth", todo.member.id, memberAuth.id);
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    memberAuth.display_name,
  );
}
