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

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_creation_with_optional_schedule(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = true;
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const title = RandomGenerator.name(3);
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const startAt = typia.random<string & tags.Format<"date-time">>();
  const dueAt = typia.random<string & tags.Format<"date-time">>();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_at: startAt,
        due_at: dueAt,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title should match request", todo.title, title);
  TestValidator.equals(
    "todo description should match request",
    todo.description,
    description,
  );
  TestValidator.equals(
    "todo start_at should match request",
    todo.start_at,
    startAt,
  );
  TestValidator.equals("todo due_at should match request", todo.due_at, dueAt);
  TestValidator.equals(
    "todo should be incomplete by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo owner id should match member id",
    todo.member.id,
    member.id,
  );
  TestValidator.equals(
    "todo owner email should match member email",
    todo.member.email,
    member.email,
  );
  TestValidator.equals(
    "todo owner deleted_at should be null",
    todo.member.deleted_at,
    null,
  );
  TestValidator.equals("todo deleted_at should be null", todo.deleted_at, null);
}
