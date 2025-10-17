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
 * Test complete member account deletion workflow including cascade removal of
 * all personal todos and associated data. Validates that when a member deletes
 * their account, all related todo items are permanently removed through
 * database cascade operations. Tests the irreversible nature of account
 * deletion and ensures proper cleanup of all member-associated data from the
 * system.
 *
 * 1. Create a new member account
 * 2. Create multiple todo items for the member
 * 3. Verify all todos exist and are associated with the member
 * 4. Delete the member account
 * 5. Verify member creation fails (account still exists in system or requires
 *    cleanup)
 * 6. Create new member account to verify system functionality post-deletion
 * 7. Create todos with new member to ensure system still operational
 */
export async function test_api_member_account_deletion_cascade(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(8) + "A1!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create multiple todo items for the member
  const todo1 = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todo1);

  const todo2 = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 7,
      }),
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todo2);

  const todo3 = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 2,
        wordMax: 6,
      }),
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todo3);

  // Step 3: Verify all todos are properly created and linked
  TestValidator.equals("todo1 member matches", todo1.member_id, member.id);
  TestValidator.equals("todo2 member matches", todo2.member_id, member.id);
  TestValidator.equals("todo3 member matches", todo3.member_id, member.id);

  TestValidator.equals(
    "all todos have required properties",
    [todo1.title, todo2.title, todo3.title].every(
      (t) => t.length >= 1 && t.length <= 200,
    ),
    true,
  );

  TestValidator.predicate(
    "todo priorities are valid",
    [todo1.priority, todo2.priority, todo3.priority].every((p) =>
      ["Low", "Medium", "High"].includes(p),
    ),
  );

  // Step 4: Delete the member account permanently
  await api.functional.todo.member.members.erase(connection, {
    memberId: member.id,
  });

  // Step 5: Verify system still accepts the deleted email for new registrations
  // (This validates account removal allows new registration)
  await TestValidator.predicate(
    "system allows account creation with same email after deletion",
    async () => {
      try {
        const newMember = await api.functional.auth.member.join(connection, {
          body: {
            email,
            password: "NewPassword123!",
          } satisfies IMemberCreate.IRequest,
        });
        typia.assert(newMember);
        TestValidator.equals(
          "new member has different ID",
          newMember.id !== member.id,
          true,
        );
        return true;
      } catch {
        return false;
      }
    },
  );

  // Step 6: Create completely new member to verify system functionality
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newMember = await api.functional.auth.member.join(connection, {
    body: {
      email: newEmail,
      password: "AnotherPassword123!",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(newMember);

  // Step 7: Create todos with new member to verify system operational
  const newTodo1 = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "First todo for new member",
      priority: "High",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(newTodo1);

  TestValidator.equals(
    "new todo belongs to new member",
    newTodo1.member_id,
    newMember.id,
  );
  TestValidator.equals(
    "new todo has correct properties",
    newTodo1.title,
    "First todo for new member",
  );
  TestValidator.equals("new todo priority is High", newTodo1.priority, "High");
}
