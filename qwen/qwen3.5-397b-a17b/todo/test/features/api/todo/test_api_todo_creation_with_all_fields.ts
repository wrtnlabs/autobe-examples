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
 * Test creating a todo with all available fields including optional description and dates.
 *
 * This test verifies the complete todo creation workflow:
 * 1. Register a new member account using authorize_member_join utility
 * 2. Create a todo with all fields: title, description, started_at, and due_at
 * 3. Verify the response contains all provided values correctly stored
 * 4. Verify the todo is marked as incomplete (completed_at is null)
 * 5. Verify deleted_at is null for newly created todo
 * 6. Verify timestamps (created_at, updated_at) are properly set
 * 7. Verify member relation shows correct ownership
 * 8. Verify no edit history entries are created for initial creation
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Prepare todo creation data with all fields
  const now = new Date();
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
  const futureDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    started_at: futureStart.toISOString(),
    due_at: futureDue.toISOString(),
  } satisfies IMultiUserTodoTodo.ICreate;
  // 4. Create todo with all fields using utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body: todoBody },
  );
  typia.assert(todo);
  // 5. Validate todo contains all provided values
  TestValidator.equals("title matches input", todo.title, todoBody.title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    todoBody.description,
  );
  TestValidator.equals(
    "started_at matches input",
    todo.started_at,
    todoBody.started_at,
  );
  TestValidator.equals("due_at matches input", todo.due_at, todoBody.due_at);
  // 6. Validate todo is marked as incomplete
  TestValidator.equals(
    "completed_at is null (incomplete)",
    todo.completed_at,
    null,
  );
  // 7. Validate deleted_at is null for new todo
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  // 8. Validate timestamps are properly set
  TestValidator.predicate("created_at is valid date-time", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.created_at,
    ),
  );
  TestValidator.predicate("updated_at is valid date-time", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.updated_at,
    ),
  );
  // 9. Validate member ownership
  TestValidator.equals(
    "member id matches authenticated user",
    todo.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "member has display name",
    () =>
      typeof todo.member.displayName === "string" &&
      todo.member.displayName.length > 0,
  );
  // 10. Validate no edit history entries for initial creation
  TestValidator.equals(
    "editHistories is empty array",
    todo.editHistories.length,
    0,
  );
}
