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

export async function test_api_todo_update_completion_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a todo with title, description, started_at, and due_at
  const originalTitle = typia.random<string & tags.MinLength<1>>();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        started_at: new Date(Date.now() - 86400000).toISOString(),
        due_at: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // Part A — Toggle to complete, clearing optional fields
  const updatedComplete = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: originalTitle,
        is_completed: true,
        description: null,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedComplete);
  // Validate Part A results
  TestValidator.equals(
    "is_completed toggled to true",
    updatedComplete.is_completed,
    true,
  );
  TestValidator.equals(
    "description cleared to null",
    updatedComplete.description,
    null,
  );
  TestValidator.equals(
    "started_at cleared to null",
    updatedComplete.started_at,
    null,
  );
  TestValidator.equals("due_at cleared to null", updatedComplete.due_at, null);
  TestValidator.equals("title unchanged", updatedComplete.title, originalTitle);
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedComplete.updated_at,
    todo.updated_at,
  );
  // Part B — Toggle back to incomplete
  const updatedIncomplete = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: originalTitle,
        is_completed: false,
        description: null,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedIncomplete);
  // Validate Part B results
  TestValidator.equals(
    "is_completed toggled back to false",
    updatedIncomplete.is_completed,
    false,
  );
}
