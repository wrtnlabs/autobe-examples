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

export async function test_api_todo_detail_retrieval_of_trashed_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a todo using the generation utility (memberConnection is now authenticated)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Verify the todo is initially active (trashed_at is null)
  TestValidator.equals(
    "todo should be active initially",
    todo.trashed_at,
    null,
  );
  // 4. Move the todo to trash (soft-delete)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Retrieve the trashed todo by its ID
  const trashedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(trashedTodo);
  // 6. Verify the trashed_at field is non-null (todo is in the trash)
  TestValidator.predicate(
    "trashed_at should be non-null after trashing",
    trashedTodo.trashed_at !== null,
  );
  // 7. Verify core fields remain unchanged from creation
  TestValidator.equals("id should match", trashedTodo.id, todo.id);
  TestValidator.equals("title should match", trashedTodo.title, todo.title);
  TestValidator.equals(
    "description should match",
    trashedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "is_completed should match",
    trashedTodo.is_completed,
    todo.is_completed,
  );
  TestValidator.equals(
    "started_at should match",
    trashedTodo.started_at,
    todo.started_at,
  );
  TestValidator.equals("due_at should match", trashedTodo.due_at, todo.due_at);
  TestValidator.equals(
    "todo_app_member_id should match",
    trashedTodo.todo_app_member_id,
    authorized.id,
  );
}
