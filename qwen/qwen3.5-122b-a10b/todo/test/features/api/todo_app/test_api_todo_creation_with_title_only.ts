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
 * Test todo creation with title only.
 *
 * Validates that a member can create a todo task with only the required title field, leaving optional fields empty. The test ensures proper handling of null/undefined optional fields and validates the default completion status.
 *
 * 1. Authenticate as a new member with randomized credentials.
 * 2. Create a todo with only the title field set.
 * 3. Validate the created todo has null/undefined for optional fields.
 * 4. Verify completion status defaults to false (incomplete).
 * 5. Confirm the todo is associated with the authenticated member.
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create todo with only title
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate optional fields are null/undefined
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  // 4. Validate completion status defaults to false
  TestValidator.predicate("is_completed is false", todo.is_completed === false);
  // 5. Validate title matches
  TestValidator.equals("title matches", todo.title, title);
  // 6. Validate author is the authenticated member
  TestValidator.equals("author id matches", todo.author.id, auth.id);
  TestValidator.equals(
    "author display_name matches",
    todo.author.display_name,
    auth.display_name,
  );
}
