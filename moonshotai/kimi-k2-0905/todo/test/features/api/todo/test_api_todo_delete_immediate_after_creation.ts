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

export async function test_api_todo_delete_immediate_after_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword1234",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member account should have valid authorization token",
    member.token !== undefined,
  );
  TestValidator.equals(
    "member account role should be member type",
    member.role,
    "member",
  );
  TestValidator.equals(
    "member account email should match registration input",
    member.email,
    memberEmail,
  );

  // Step 2: Immediately create a new todo (minimal data for rapid testing)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: todoTitle,
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todo);

  TestValidator.equals(
    "created todo title should match input title",
    todo.title,
    todoTitle,
  );
  TestValidator.predicate(
    "created todo should have valid UUID identifier",
    todo.id !== undefined,
  );
  TestValidator.equals(
    "created todo owner should match authenticated member",
    todo.member_id,
    member.id,
  );
  TestValidator.equals(
    "created todo should be initially incomplete",
    todo.completed,
    false,
  );

  // Step 3: Verify delete operation completes without error (rapid create-delete cycle)
  await TestValidator.error(
    "rapid delete should not throw errors",
    async () => {
      await api.functional.todo.member.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );

  TestValidator.predicate(
    "rapid create-delete cycle completed successfully",
    true,
  );
}
