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

export async function test_api_todo_update_title_only_patch_semantics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  // 2. Create a todo with all optional fields populated
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Original Todo Title",
        description:
          "This is a detailed description of the todo item to verify patch semantics.",
        start_date: "2026-04-01T00:00:00.000Z",
        due_date: "2026-04-30T00:00:00.000Z",
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo);
  // Record original values for patch semantics verification
  const originalDescription = todo.description;
  const originalStartDate = todo.start_date;
  const originalDueDate = todo.due_date;
  const originalUpdatedAt = todo.updated_at;
  // 3. Update only the title — no other fields provided
  const newTitle = "Updated Title Only — Patch Semantics Test";
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate patch semantics — title updated, other fields unchanged
  TestValidator.equals(
    "title updated to new value",
    updatedTodo.title,
    newTitle,
  );
  TestValidator.equals(
    "description retained original value",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date retained original value",
    updatedTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date retained original value",
    updatedTodo.due_date,
    originalDueDate,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedTodo.updated_at > originalUpdatedAt,
  );
}
