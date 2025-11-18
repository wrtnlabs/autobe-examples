import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a different user's information by email.
 *
 * This test validates cross-user retrieval functionality by creating two
 * separate user accounts and using one authenticated user to retrieve the
 * profile of the other user by email address. It ensures that the API properly
 * supports cross-user data retrieval and returns appropriate user data without
 * exposing sensitive authentication information.
 */
export async function test_api_user_retrieval_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (authenticated user who will perform retrieval)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://todoapp.com/register",
      referrer: "https://todoapp.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userA);

  // Step 2: Create second user account (target user to be retrieved)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "password456",
      name: RandomGenerator.name(),
      href: "https://todoapp.com/register",
      referrer: "https://todoapp.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userB);

  // Step 3: Use first authenticated user to retrieve second user's profile by email
  const retrievedUser = await api.functional.todoApp.user.users.at(connection, {
    userEmail: userBEmail,
  });
  typia.assert(retrievedUser);

  // Step 4: Validate that retrieved data matches the target user's information
  TestValidator.equals(
    "retrieved user email matches target user email",
    retrievedUser.email,
    userB.email,
  );
  TestValidator.equals(
    "retrieved user name matches target user name",
    retrievedUser.name,
    userB.name,
  );
  TestValidator.equals(
    "retrieved user status matches target user status",
    retrievedUser.status,
    userB.status,
  );
  TestValidator.notEquals(
    "retrieved user ID should not match retrieving user ID",
    retrievedUser.id,
    userA.id,
  );
  TestValidator.equals(
    "retrieved user ID matches target user ID",
    retrievedUser.id,
    userB.id,
  );

  // Step 5: Validate that sensitive authentication data is not exposed
  TestValidator.predicate(
    "retrieved user should not contain token information",
    !("token" in retrievedUser),
  );
  TestValidator.predicate(
    "retrieved user should not contain password information",
    !("password" in retrievedUser),
  );
}
