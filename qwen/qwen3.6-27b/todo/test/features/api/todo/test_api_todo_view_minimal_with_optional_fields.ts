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
 * Test the todo viewing workflow when only required fields are provided during creation.
 *
 * Validates the complete todo creation and retrieval flow: member authentication, minimal todo creation with only title, and subsequent retrieval via the dedicated GET endpoint. Ensures that nullable optional fields (description, start_date, due_date) correctly return as null when not specified during creation. Verifies default values for is_completed (false) and deleted_at (null for active todos). Confirms that system-generated fields (id, created_at, updated_at) are properly populated and that the member reference in the response accurately reflects the authenticated member's identity.
 *
 * 1. Authenticate as a member with unique credentials.
 * 2. Create a todo with only the required title field, omitting all optional fields.
 * 3. Retrieve the created todo by its ID using the specific GET endpoint.
 * 4. Validate that optional fields are null and defaults are correct.
 * 5. Confirm member reference in response matches authenticated member.
 */
export async function test_api_todo_view_minimal_with_optional_fields(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      display_name: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo with only required title field
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by its ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate nullable optional fields are null
  TestValidator.equals("description is null", retrievedTodo.description, null);
  TestValidator.equals("start_date is null", retrievedTodo.start_date, null);
  TestValidator.equals("due_date is null", retrievedTodo.due_date, null);
  // 5. Verify default values
  TestValidator.equals(
    "is_completed defaults to false",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    retrievedTodo.deleted_at,
    null,
  );
  // 6. Verify system-generated fields are populated
  TestValidator.predicate("id is present", retrievedTodo.id.length > 0);
  TestValidator.predicate(
    "created_at is present",
    retrievedTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedTodo.updated_at.length > 0,
  );
  // 7. Verify title matches input
  TestValidator.equals("title matches input", retrievedTodo.title, todo.title);
  // 8. Verify member reference matches authenticated member
  TestValidator.equals(
    "member id matches",
    retrievedTodo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedTodo.member.email,
    authorized.email,
  );
}
