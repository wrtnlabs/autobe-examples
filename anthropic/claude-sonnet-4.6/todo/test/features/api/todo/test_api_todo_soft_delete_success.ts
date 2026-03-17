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

export async function test_api_todo_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create an active todo item using the generation utility
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Buy groceries",
        description: "Milk, Bread, Eggs, and Butter",
      },
    },
  );
  typia.assert(todo);
  // Verify the todo is active (trashed_at must be null before deletion)
  TestValidator.equals(
    "todo is initially active (trashed_at is null)",
    todo.trashed_at,
    null,
  );
  // Verify the todo belongs to the authenticated member
  TestValidator.equals(
    "todo belongs to authenticated member",
    todo.todo_app_member_id,
    authorized.id,
  );
  // Step 3: Perform soft deletion (move todo to trash)
  // The erase endpoint returns void; completing without error confirms success.
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
}
