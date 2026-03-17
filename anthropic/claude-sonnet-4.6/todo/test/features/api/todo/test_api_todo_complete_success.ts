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

export async function test_api_todo_complete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo for this member
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Buy groceries",
        description: "Milk, eggs, bread, and butter",
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // Confirm the todo is initially not completed
  TestValidator.equals(
    "todo is_completed should be false initially",
    todo.is_completed,
    false,
  );
  TestValidator.equals("todo trashed_at should be null", todo.trashed_at, null);
  // 3. Mark the todo as complete
  const completed = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(completed);
  // 4. Validate the response
  TestValidator.equals(
    "is_completed should be true after completion",
    completed.is_completed,
    true,
  );
  TestValidator.equals(
    "trashed_at should remain null",
    completed.trashed_at,
    null,
  );
  // Immutable fields should remain unchanged
  TestValidator.equals("id should remain unchanged", completed.id, todo.id);
  TestValidator.equals(
    "todo_app_member_id should remain unchanged",
    completed.todo_app_member_id,
    todo.todo_app_member_id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    completed.title,
    todo.title,
  );
  TestValidator.equals(
    "description should remain unchanged",
    completed.description,
    todo.description,
  );
  TestValidator.equals(
    "started_at should remain unchanged",
    completed.started_at,
    todo.started_at,
  );
  TestValidator.equals(
    "due_at should remain unchanged",
    completed.due_at,
    todo.due_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    completed.created_at,
    todo.created_at,
  );
  // updated_at should be >= original updated_at
  TestValidator.predicate(
    "updated_at should be >= original",
    new Date(completed.updated_at) >= new Date(todo.updated_at),
  );
  // 5. Idempotency check: call complete again on already-completed todo
  const completedAgain = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(completedAgain);
  TestValidator.equals(
    "is_completed should still be true after second completion",
    completedAgain.is_completed,
    true,
  );
}
