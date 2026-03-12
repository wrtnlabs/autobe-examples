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
 * Test that an authenticated member can create a new todo item with all optional fields including description, start date, and due date.
 *
 * Test Steps:
 * 1. Register a new member account
 * 2. Create a todo with all fields (title, description, start_date, due_date)
 * 3. Validate the response contains all expected fields with correct values
 * 4. Verify default values for completed, deleted, and deleted_at
 */
export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Prepare input values for todo creation
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000); // tomorrow
  const dueDate = new Date(now.getTime() + 604800000); // 7 days from now
  const inputTitle = RandomGenerator.paragraph({ sentences: 3 });
  const inputDescription = RandomGenerator.paragraph({ sentences: 5 });
  // 3. Create todo with all optional fields
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: inputTitle,
        description: inputDescription,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate business logic - values match input and defaults are correct
  TestValidator.equals("title matches input", todo.title, inputTitle);
  TestValidator.equals(
    "description matches input",
    todo.description,
    inputDescription,
  );
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
  TestValidator.equals("completed is false by default", todo.completed, false);
  TestValidator.equals("deleted is false by default", todo.deleted, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
}
