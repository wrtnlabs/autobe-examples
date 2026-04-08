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
 * Test todo creation with valid date range where due_date >= start_date.
 *
 * Validates that members can successfully create todo tasks with both start date and due date when the date range is valid (due_date is after or equal to start_date). The test ensures that the business logic for date validation is properly enforced and that both date fields are stored correctly in UTC format.
 *
 * The test covers the following validation points:
 * 1. Todo creation succeeds when due_date >= start_date
 * 2. Both start_date and due_date are stored correctly in the response
 * 3. The created todo has default completion status (is_completed = false)
 * 4. The author field contains the authenticated member's summary information
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Member creates a todo with start_date and due_date where due_date >= start_date.
 * 3. Validates the created todo has correct date values matching input.
 * 4. Validates the todo has default is_completed = false.
 * 5. Validates the author field contains member summary with id, display_name, and created_at.
 */
export async function test_api_todo_creation_with_valid_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate valid date range (due_date >= start_date)
  const startDate = RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000);
  const dueDate = RandomGenerator.date(startDate, 30 * 24 * 60 * 60 * 1000);
  // 3. Create todo with valid date range
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate date fields match input
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_date matches input",
    todo.due_date,
    dueDate.toISOString(),
  );
  // 5. Validate completion status is false by default
  TestValidator.predicate("is_completed is false", todo.is_completed === false);
  // 6. Validate author field contains member summary
  TestValidator.equals(
    "author id matches member id",
    todo.author.id,
    member.id,
  );
  TestValidator.equals(
    "author display_name matches",
    todo.author.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "author has created_at",
    typeof todo.author.created_at === "string",
  );
}
