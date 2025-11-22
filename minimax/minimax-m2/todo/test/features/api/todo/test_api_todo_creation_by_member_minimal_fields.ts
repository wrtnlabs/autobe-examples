import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_creation_by_member_minimal_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with minimal required data
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const member = await api.functional.auth.member.join.registerMember(
    connection,
    {
      body: {
        email: memberEmail,
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 2: Create a todo item with minimal required data (only title)
  const todoTitle = RandomGenerator.paragraph();

  const todo = await api.functional.todoApp.member.todos.create(connection, {
    body: {
      title: todoTitle,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Validate the todo was created with proper default values
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo has default pending status",
    todo.status,
    "pending",
  );
  TestValidator.equals(
    "todo has default active business status",
    todo.business_status,
    "active",
  );
  TestValidator.equals(
    "todo has default medium priority",
    todo.priority,
    "medium",
  );

  // Step 4: Validate todo ownership and system fields
  TestValidator.predicate(
    "todo has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "todo has creation timestamp",
    typeof todo.created_at === "string",
  );
  TestValidator.predicate(
    "todo has update timestamp",
    typeof todo.updated_at === "string",
  );
  TestValidator.equals("todo is not deleted", todo.deleted_at, null);
}
