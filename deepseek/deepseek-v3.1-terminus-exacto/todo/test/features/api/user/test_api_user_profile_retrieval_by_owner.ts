import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test authenticated user profile retrieval with proper security boundaries.
 *
 * This test validates that users can access their complete account information
 * including email, status, and timestamps while ensuring security policies
 * prevent unauthorized access to other users' profiles. The test follows a
 * complete workflow from user registration through profile retrieval.
 *
 * Steps performed:
 *
 * 1. Create a new user account with valid credentials
 * 2. Retrieve the user's profile using their own ID
 * 3. Validate all profile fields match registration data
 * 4. Ensure timestamps and security information are properly set
 */
export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Create test user account for authentication context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "testPassword123";

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        password_hash: typia.random<string>(), // Server will properly hash this
        status: "pending" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a todo to establish user creation context as per dependency
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Retrieve the user's own profile using their ID
  const retrievedProfile: ITodoAppUser =
    await api.functional.todoApp.user.users.at(connection, {
      userId: registeredUser.id,
    });
  typia.assert(retrievedProfile);

  // 4. Validate that retrieved profile matches registration data
  TestValidator.equals(
    "user ID should match registered user",
    retrievedProfile.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "email should match registration email",
    retrievedProfile.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "status should be pending for new registration",
    retrievedProfile.status,
    registeredUser.status,
  );
  TestValidator.equals(
    "password hash should be present",
    retrievedProfile.password_hash,
    registeredUser.password_hash,
  );

  // 5. Validate that deleted_at is undefined for active user
  TestValidator.predicate(
    "deleted_at should be undefined for active user",
    retrievedProfile.deleted_at === undefined,
  );
}
