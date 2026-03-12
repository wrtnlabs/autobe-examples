import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test that an authenticated member can create a new todo item with only the required title field.
 *
 * This test verifies:
 * 1. Member registration and authentication flow
 * 2. Todo creation with minimal required fields (title only)
 * 3. System-generated defaults for optional fields
 * 4. Response type validation and business logic verification
 */
export async function test_api_todo_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create todo with only required title field (minimal fields)
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: todoTitle,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate business logic - title matches input
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  // 4. Validate system-generated defaults
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  TestValidator.equals("completed is false", todo.completed, false);
  TestValidator.equals("deleted is false", todo.deleted, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  // 5. Validate system-generated fields exist
  TestValidator.predicate("has valid UUID id", todo.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    todo.updated_at.length > 0,
  );
  // 6. Validate member association
  TestValidator.equals("member id matches", todo.member.id, authResult.id);
  TestValidator.equals(
    "member email matches",
    todo.member.email,
    authResult.email,
  );
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    authResult.display_name,
  );
}
