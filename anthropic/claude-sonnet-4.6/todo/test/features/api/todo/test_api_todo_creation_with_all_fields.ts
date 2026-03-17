import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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
  // 1. Setup: Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Prepare todo creation body with all fields populated
  const now = new Date();
  const startedAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dueAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const title = `Buy groceries ${RandomGenerator.alphabets(6)}`;
  const description = "Milk, eggs, bread, and butter";
  const body = {
    title,
    description,
    started_at: startedAt,
    due_at: dueAt,
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create the todo using the generation utility (MANDATORY - do not use SDK directly)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body },
  );
  typia.assert(todo);
  // 4. Validate business logic
  TestValidator.equals(
    "todo owner matches member",
    todo.todo_app_member_id,
    authorized.id,
  );
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  TestValidator.predicate(
    "is_completed is false on creation",
    todo.is_completed === false,
  );
  TestValidator.equals("started_at matches input", todo.started_at, startedAt);
  TestValidator.equals("due_at matches input", todo.due_at, dueAt);
  TestValidator.equals("trashed_at is null on creation", todo.trashed_at, null);
}
