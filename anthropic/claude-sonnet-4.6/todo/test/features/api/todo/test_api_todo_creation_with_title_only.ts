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

export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain a valid JWT session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with only the title field provided
  const title = "Read a book";
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate business logic assertions
  TestValidator.equals(
    "todo owner matches member",
    todo.todo_app_member_id,
    member.id,
  );
  TestValidator.equals("title matches submitted value", todo.title, title);
  TestValidator.equals("description defaults to null", todo.description, null);
  TestValidator.equals(
    "is_completed defaults to false",
    todo.is_completed,
    false,
  );
  TestValidator.equals("started_at defaults to null", todo.started_at, null);
  TestValidator.equals("due_at defaults to null", todo.due_at, null);
  TestValidator.equals("trashed_at defaults to null", todo.trashed_at, null);
  // 4. Verify that creating multiple title-only todos each succeed independently
  const title2 = "Write a report";
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title2,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "second todo owner matches member",
    todo2.todo_app_member_id,
    member.id,
  );
  TestValidator.equals("second todo title matches", todo2.title, title2);
  TestValidator.equals(
    "second todo description defaults to null",
    todo2.description,
    null,
  );
  TestValidator.equals(
    "second todo is_completed defaults to false",
    todo2.is_completed,
    false,
  );
  TestValidator.equals(
    "second todo started_at defaults to null",
    todo2.started_at,
    null,
  );
  TestValidator.equals(
    "second todo due_at defaults to null",
    todo2.due_at,
    null,
  );
  TestValidator.equals(
    "second todo trashed_at defaults to null",
    todo2.trashed_at,
    null,
  );
  // 5. Ensure the two todos have distinct IDs
  TestValidator.notEquals("todos have distinct IDs", todo.id, todo2.id);
}
