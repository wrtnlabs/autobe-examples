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

/**
 * Test the edge case where a member retrieves their own todo that has been soft-deleted (moved to trash).
 *
 * Workflow:
 * 1. Register a new member account
 * 2. Create a todo item
 * 3. Soft delete the todo (move to trash)
 * 4. Retrieve the deleted todo detail
 * 5. Validate deleted_at is non-null and all other fields remain intact
 */
export async function test_api_todo_detail_soft_deleted_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authorized connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Create a todo item
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Verify todo is initially active (deleted_at is null)
  TestValidator.equals("todo initially active", todo.deleted_at, null);
  // 5. Soft delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 6. Retrieve the deleted todo detail
  const deletedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(deletedTodo);
  // 7. Validate deleted_at is now set (non-null timestamp)
  TestValidator.predicate("deleted_at is set", deletedTodo.deleted_at !== null);
  TestValidator.predicate(
    "deleted_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      deletedTodo.deleted_at!,
    ),
  );
  // 8. Validate all other fields remain intact
  TestValidator.equals("todo id unchanged", deletedTodo.id, todo.id);
  TestValidator.equals("title unchanged", deletedTodo.title, todo.title);
  TestValidator.equals(
    "description unchanged",
    deletedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date unchanged",
    deletedTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date unchanged",
    deletedTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "completed status unchanged",
    deletedTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "member unchanged",
    deletedTodo.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    deletedTodo.created_at,
    todo.created_at,
  );
  // 9. Validate updated_at has changed (due to soft delete operation)
  TestValidator.notEquals(
    "updated_at changed after delete",
    deletedTodo.updated_at,
    todo.updated_at,
  );
}
