import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test creating a todo with only the required title field.
 *
 * After member registration, create a todo with just a title (no description,
 * start date, or due date). Verify the response contains the complete todo
 * entity with system-generated UUID, the provided title, null values for
 * optional fields (description, started_at, due_at), completed_at is null
 * (incomplete by default), deleted_at is null, and timestamps (created_at,
 * updated_at) are set. Verify the member relation is correctly associated
 * with the authenticated user. Verify no edit history entries are created
 * for initial todo creation (editHistories array should be empty). This
 * tests the most common workflow where users quickly create todos with
 * minimal information.
 */
export async function test_api_todo_creation_minimal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create authenticated connection for the member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joinResult.token.access}`,
    },
  };
  // 3. Create todo with minimal fields (title only)
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: todoTitle,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate todo structure and values
  TestValidator.equals("title matches input", todo.title, todoTitle);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("started_at is null", todo.started_at, null);
  TestValidator.equals("due_at is null", todo.due_at, null);
  TestValidator.equals(
    "completed_at is null (incomplete)",
    todo.completed_at,
    null,
  );
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(todo.id),
  );
  TestValidator.predicate("created_at is set", todo.created_at.length > 0);
  TestValidator.predicate("updated_at is set", todo.updated_at.length > 0);
  TestValidator.equals("member id matches", todo.member.id, joinResult.id);
  TestValidator.equals("editHistories is empty", todo.editHistories.length, 0);
}
