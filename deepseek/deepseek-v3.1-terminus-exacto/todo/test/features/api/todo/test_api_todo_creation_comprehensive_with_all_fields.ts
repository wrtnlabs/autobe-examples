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
 * Test creating a comprehensive todo with all optional fields populated.
 * 1. Authenticate as a member user
 * 2. Create a todo with title, detailed description, start date, and due date
 * 3. Validate business logic: due_date occurs after start_date when both provided
 * 4. Verify all fields are stored correctly with proper formatting
 * 5. Check system-generated fields: timestamps, ownership, completion status
 * 6. Confirm todo is not completed by default
 */
export async function test_api_todo_creation_comprehensive_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create todo with all fields - ensure start_date < due_date
  const today = new Date();
  const startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from today
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Validate business logic: due_date > start_date when both provided
  if (todo.start_date !== null && todo.due_date !== null) {
    const start = new Date(todo.start_date);
    const due = new Date(todo.due_date);
    TestValidator.predicate(
      "due_date must be after start_date when both provided",
      due > start,
    );
  }
  // 4. Validate all fields are stored correctly
  TestValidator.equals(
    "title should not be empty",
    todo.title.length > 0,
    true,
  );
  TestValidator.notEquals(
    "description should not be null",
    todo.description,
    null,
  );
  TestValidator.predicate(
    "description should not be empty",
    todo.description!.length > 0,
  );
  TestValidator.notEquals(
    "start_date should not be null",
    todo.start_date,
    null,
  );
  TestValidator.notEquals("due_date should not be null", todo.due_date, null);
  // 5. Validate system-generated fields
  TestValidator.predicate("should have valid UUID", todo.id.length > 0);
  TestValidator.predicate(
    "created_at should be valid ISO date",
    !isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    !isNaN(Date.parse(todo.updated_at)),
  );
  TestValidator.equals(
    "deleted_at should be null for active todo",
    todo.deleted_at,
    null,
  );
  TestValidator.equals(
    "member.id should match creator",
    todo.member.id,
    member.id,
  );
  TestValidator.equals(
    "member.email should match creator",
    todo.member.email,
    member.email,
  );
  TestValidator.equals(
    "member.display_name should match creator",
    todo.member.display_name,
    member.display_name,
  );
  // 6. Validate completion status
  TestValidator.equals(
    "todo should be incomplete by default",
    todo.is_completed,
    false,
  );
  // 7. Additional date format validations
  if (todo.start_date !== null) {
    const start = new Date(todo.start_date);
    TestValidator.predicate(
      "start_date should be valid ISO string",
      start.toISOString() === todo.start_date,
    );
  }
  if (todo.due_date !== null) {
    const due = new Date(todo.due_date);
    TestValidator.predicate(
      "due_date should be valid ISO string",
      due.toISOString() === todo.due_date,
    );
  }
}
