import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test creating a todo with all optional fields populated including description, start_date, and due_date.
 *
 * Validates the complete todo creation flow with all optional fields provided. The authenticated member creates a new todo with complete scheduling information including title, description, start date, and due date. Ensures that the todo is created successfully with default states (is_completed: false, is_deleted: false) and all provided optional fields are correctly stored and returned.
 *
 * Special attention is given to verifying that dates are stored in ISO 8601 format, the description is preserved exactly as provided, and the created todo is immediately accessible with all fields intact including the member relation and empty edit histories array.
 *
 * 1. Register and authenticate a new member using authorize_member_join utility function.
 * 2. Create a member-specific connection with the authentication token.
 * 3. Prepare todo creation data with all optional fields: title, description, start_date, and due_date.
 * 4. Create the todo using generate_random_todo_app_member_todos_create utility function with custom body.
 * 5. Validate the response structure using typia.assert().
 * 6. Verify is_completed is false (default for new todos).
 * 7. Verify is_deleted is false (new todos are not deleted).
 * 8. Verify all optional fields match the input values exactly.
 * 9. Validate that the member relation is properly populated with the authenticated user's information.
 * 10. Verify editHistories array is empty (no edits made yet, only creation).
 */
export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
  // 3. Prepare todo creation data with all optional fields
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({ paragraphs: 2 });
  const startDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const dueDate = new Date(Date.now() + 604800000).toISOString(); // Next week
  // 4. Create the todo with all optional fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 5. Verify default states
  TestValidator.equals("is_completed is false", todo.isCompleted, false);
  TestValidator.equals("is_deleted is false", todo.isDeleted, false);
  TestValidator.equals("deleted_at is null", todo.deletedAt, null);
  // 6. Verify all fields match input
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("description matches", todo.description, description);
  TestValidator.equals("start_date matches", todo.startDate, startDate);
  TestValidator.equals("due_date matches", todo.dueDate, dueDate);
  // 7. Verify member relation is populated correctly
  TestValidator.equals("member id matches", todo.member.id, memberAuth.id);
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    memberAuth.display_name,
  );
  // 8. Verify editHistories is empty (creation doesn't create history entry)
  TestValidator.equals("editHistories is empty", todo.editHistories.length, 0);
}
