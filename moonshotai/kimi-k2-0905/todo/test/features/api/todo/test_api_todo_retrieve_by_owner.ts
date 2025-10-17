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

/**
 * Test complete workflow for retrieving specific todo items.
 *
 * Validates that after member registration and todo creation, the member can
 * fetch detailed information about their own todo items. Verifies that all
 * properties including title, completion status, priority, timestamps and
 * metadata are correctly returned. Tests protection against accessing todos
 * owned by other members.
 *
 * Complete workflow:
 *
 * 1. Register a new member account for authentication
 * 2. Create a todo item under the member's ownership
 * 3. Retrieve the created todo using authentication
 * 4. Validate all todo properties match expected values
 * 5. Test access control by attempting to access another member's todo
 */
export async function test_api_todo_retrieve_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Verify member registration response includes required properties
  TestValidator.equals("member has email", member.email, memberEmail);
  TestValidator.equals(
    "member has member role",
    member.role,
    "member" as IETodoRole,
  );
  TestValidator.predicate(
    "member has valid token",
    member.token.access.length > 0,
  );

  // Step 2: Create a todo item under the member's ownership
  const todoCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    priority: RandomGenerator.pick([
      "Low",
      "Medium",
      "High",
    ] as const) as IETodoPriority,
  } satisfies ITodoTodo.ITodoCreate;

  const createdTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: todoCreate,
    },
  );
  typia.assert(createdTodo);

  // Verify the created todo has all expected properties
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "todo priority matches input",
    createdTodo.priority,
    todoCreate.priority,
  );
  TestValidator.predicate(
    "todo is not completed",
    createdTodo.completed === false,
  );
  TestValidator.predicate("todo has valid ID", createdTodo.id.length > 0);
  TestValidator.equals(
    "todo member_id matches member",
    createdTodo.member_id,
    member.id,
  );
  TestValidator.predicate(
    "todo has creation timestamp",
    createdTodo.created_at.length > 0,
  );

  // Step 3: Retrieve the created todo using authentication
  const retrievedTodo = await api.functional.todo.member.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Step 4: Validate all todo properties match expected values
  TestValidator.equals(
    "retrieved todo matches created todo",
    retrievedTodo,
    createdTodo,
  );
  TestValidator.equals("retrieved todo ID", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "retrieved todo title",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo completion status",
    retrievedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "retrieved todo priority",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "retrieved todo member_id",
    retrievedTodo.member_id,
    createdTodo.member_id,
  );
  TestValidator.equals(
    "retrieved todo created_at",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "retrieved todo updated_at",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "retrieved todo completed_at",
    retrievedTodo.completed_at,
    createdTodo.completed_at,
  );

  // Step 5: Test access control by creating another member and attempting to access first member's todo
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: "OtherPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(otherMember);

  // Create a todo for the other member
  const otherTodoCreate = {
    title: "Other member's todo",
    priority: "Medium" as IETodoPriority,
  } satisfies ITodoTodo.ITodoCreate;

  const otherTodo = await api.functional.todo.member.todos.create(connection, {
    body: otherTodoCreate,
  });
  typia.assert(otherTodo);

  // Verify that each member can only see their own todos
  TestValidator.notEquals(
    "member IDs are different",
    member.id,
    otherMember.id,
  );
  TestValidator.equals(
    "first todo belongs to first member",
    createdTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "second todo belongs to second member",
    otherTodo.member_id,
    otherMember.id,
  );
}
