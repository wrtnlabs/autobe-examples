import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_member_todo_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user to enable todo operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoMember.IAuthorized = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: "SecurePass123",
      } satisfies IMemberCreate.IRequest,
    },
  );
  typia.assert(member);
  TestValidator.equals("member has member role", member.role, "member");
  TestValidator.equals(
    "member token is valid JWT",
    typeof member.token.access,
    "string",
  );

  // Step 2: Create a todo item to be deleted
  const todo: ITodoTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: "Test Todo for Deletion - Complete Documentation Review",
        priority: "Medium",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo title matches input",
    todo.title,
    "Test Todo for Deletion - Complete Documentation Review",
  );
  TestValidator.equals("todo has correct priority", todo.priority, "Medium");
  TestValidator.equals(
    "todo completion status is false",
    todo.completed,
    false,
  );
  TestValidator.predicate(
    "todo ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(todo.id),
  );
  TestValidator.predicate(
    "member ID matches creator",
    todo.member_id === member.id,
  );

  // Step 3: Delete the todo item permanently
  await api.functional.todo.member.todos.erase(connection, { todoId: todo.id });

  // Step 4: Create a second todo to verify normal operation still works after deletion
  const secondTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Second Todo - Verify System Still Works",
      priority: "Low",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(secondTodo);
  TestValidator.equals(
    "second todo created successfully",
    secondTodo.priority,
    "Low",
  );

  // Step 5: Delete the second todo to demonstrate complete lifecycle
  await api.functional.todo.member.todos.erase(connection, {
    todoId: secondTodo.id,
  });
}
