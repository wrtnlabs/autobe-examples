import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Tests that created todos are exclusively associated with the authenticated
 * user.
 *
 * Multiple users create todos and the test verifies that:
 *
 * 1. System automatically associates each todo with the authenticated user's ID
 *    from JWT token
 * 2. Different users' todos are never mixed up
 * 3. Each user can only create todos assigned to their own user ID
 * 4. Data isolation is enforced at creation time
 * 5. User A and User B have completely separate todo collections
 *
 * Process:
 *
 * 1. Register first user (User A) and receive JWT tokens
 * 2. User A creates multiple todos with various properties
 * 3. Verify all of User A's todos have User A's ID in todo_app_user_id field
 * 4. Register second user (User B) and receive JWT tokens
 * 5. User B creates multiple todos with various properties
 * 6. Verify all of User B's todos have User B's ID in todo_app_user_id field
 * 7. Verify User A's todos still have User A's ID (not User B's)
 * 8. Verify User B's todos have User B's ID (not User A's)
 * 9. Confirm complete data isolation between users
 */
export async function test_api_todo_creation_data_isolation_user_association(
  connection: api.IConnection,
) {
  // Step 1: Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(10);

  const userA: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: userAPassword,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(userA);
  TestValidator.equals(
    "User A registration successful",
    userA.email,
    userAEmail,
  );
  TestValidator.equals("User A status is active", userA.status, "active");

  const userAId: string = userA.id;

  // Step 2: User A creates first todo
  const todoA1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);
  TestValidator.equals(
    "User A's first todo is assigned to User A",
    todoA1.todo_app_user_id,
    userAId,
  );
  TestValidator.equals(
    "User A's first todo has active status",
    todoA1.status,
    "active",
  );

  // Step 3: User A creates second todo
  const todoA2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);
  TestValidator.equals(
    "User A's second todo is assigned to User A",
    todoA2.todo_app_user_id,
    userAId,
  );

  // Step 4: User A creates third todo with a specific title for later comparison
  const identicalTitle = "Important Task";
  const todoA3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: identicalTitle,
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA3);
  TestValidator.equals(
    "User A's todo with specific title is assigned to User A",
    todoA3.todo_app_user_id,
    userAId,
  );

  // Step 5: Register User B with different email
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(10);

  const userB: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: userBPassword,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(userB);
  TestValidator.equals(
    "User B registration successful",
    userB.email,
    userBEmail,
  );
  TestValidator.equals("User B status is active", userB.status, "active");
  TestValidator.notEquals(
    "User B ID differs from User A ID",
    userB.id,
    userAId,
  );

  const userBId: string = userB.id;

  // Step 6: User B creates first todo
  const todoB1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "low",
        due_date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB1);
  TestValidator.equals(
    "User B's first todo is assigned to User B",
    todoB1.todo_app_user_id,
    userBId,
  );
  TestValidator.notEquals(
    "User B's first todo is not assigned to User A",
    todoB1.todo_app_user_id,
    userAId,
  );

  // Step 7: User B creates second todo with identical title to User A's todo
  const todoB2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: identicalTitle,
        priority: "low",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB2);
  TestValidator.equals(
    "User B's todo with identical title is assigned to User B",
    todoB2.todo_app_user_id,
    userBId,
  );
  TestValidator.notEquals(
    "User B's identical-title todo differs from User A's",
    todoB2.id,
    todoA3.id,
  );
  TestValidator.notEquals(
    "User B's identical-title todo has different user_id than User A's",
    todoB2.todo_app_user_id,
    todoA3.todo_app_user_id,
  );

  // Step 8: Final verification - confirm complete data isolation
  TestValidator.predicate("User A todos are all assigned to User A", () => {
    const userATodos = [todoA1, todoA2, todoA3];
    return userATodos.every((todo) => todo.todo_app_user_id === userAId);
  });

  TestValidator.predicate("User B todos are all assigned to User B", () => {
    const userBTodos = [todoB1, todoB2];
    return userBTodos.every((todo) => todo.todo_app_user_id === userBId);
  });

  TestValidator.predicate("No cross-user data leakage detected", () => {
    const userATodos = [todoA1, todoA2, todoA3];
    const userBTodos = [todoB1, todoB2];

    // Ensure no User A todo has User B's ID
    const noAtoB = userATodos.every(
      (todo) => todo.todo_app_user_id !== userBId,
    );
    // Ensure no User B todo has User A's ID
    const noBtoA = userBTodos.every(
      (todo) => todo.todo_app_user_id !== userAId,
    );

    return noAtoB && noBtoA;
  });
}
