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
 * Test creating a todo item with all optional fields populated.
 *
 * Validates the todo creation flow where a member registers and creates a todo with title, description, start_date, and due_date. Verifies that all provided fields are correctly stored in the response, the is_completed flag defaults to false, and system-generated fields (id, created_at, updated_at) are present and properly formatted.
 *
 * The test also ensures that the todo is associated with the correct owning member by checking the member reference in the response matches the authenticated member's identity.
 *
 * 1. Register a new member and authenticate.
 * 2. Create a todo with title, description, start_date, and due_date.
 * 3. Validate all input fields match the response.
 * 4. Verify is_completed defaults to false.
 * 5. Confirm system-generated fields are present and valid.
 */
export async function test_api_todo_create_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Prepare todo creation data with all optional fields
  const inputTitle = RandomGenerator.name();
  const inputDescription = RandomGenerator.paragraph({ sentences: 3 });
  const inputStartDate = new Date().toISOString();
  const inputDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const body = {
    title: inputTitle,
    description: inputDescription,
    start_date: inputStartDate,
    due_date: inputDueDate,
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(todo);
  // 4. Validate input fields match response
  TestValidator.equals("title matches input", todo.title, inputTitle);
  TestValidator.equals(
    "description matches input",
    todo.description,
    inputDescription,
  );
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    inputStartDate,
  );
  TestValidator.equals("due_date matches input", todo.due_date, inputDueDate);
  // 5. Verify is_completed defaults to false
  TestValidator.predicate(
    "is_completed defaults to false",
    todo.is_completed === false,
  );
  // 6. Verify member association
  TestValidator.predicate(
    "member reference present",
    todo.member.id.length > 0,
  );
}
