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
 * Test attempting to delete todos owned by other members.
 *
 * This test validates that the access control prevents members from deleting
 * todos that don't belong to them. Tests proper authorization checks and error
 * responses when attempting cross-user deletions.
 */
export async function test_api_delete_other_member_todo(
  connection: api.IConnection,
) {
  // Step 1: Create first member account via registration
  const member1Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies IMemberCreate.IRequest;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Credentials,
  });
  typia.assert(member1);

  // Step 2: Create second member account for cross-access testing
  const member2Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "anotherPassword123",
  } satisfies IMemberCreate.IRequest;

  // Store credentials for later use when switching authentication
  await api.functional.auth.member.join(connection, {
    body: member2Credentials,
  });

  // Step 3: Create todo item with first member's account
  const member1Todo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(member1Todo);
  TestValidator.equals(
    "member1 todo created successfully",
    member1Todo.member_id,
    member1.id,
  );

  // Step 4: Verify first member can delete their own todo (should succeed)
  await api.functional.todo.member.todos.erase(connection, {
    todoId: member1Todo.id,
  });

  // Step 5: Create another todo with member1 account for cross-user test
  const member1SecondTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(member1SecondTodo);

  // Step 6: Switch to second member's authentication (create new member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "thirdMemberPassword",
    } satisfies IMemberCreate.IRequest,
  });

  // Step 7: Test that new member cannot delete member1's todo (authorization check)
  await TestValidator.error(
    "member cannot delete other member's todo",
    async () => {
      await api.functional.todo.member.todos.erase(connection, {
        todoId: member1SecondTodo.id,
      });
    },
  );
}
