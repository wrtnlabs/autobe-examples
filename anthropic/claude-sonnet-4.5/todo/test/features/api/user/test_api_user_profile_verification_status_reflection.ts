import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the email_verified field accurately reflects the verification state
 * of a user account.
 *
 * This scenario creates a new user account and retrieves the profile to verify
 * that email_verified is initially set to false. This validates that the
 * registration process correctly initializes the verification status and that
 * profile retrieval accurately reflects the current state of email
 * verification. The test confirms that unverified accounts are properly tracked
 * in the system.
 *
 * Test Workflow:
 *
 * 1. Generate random user registration data with email and password
 * 2. Create a new user account via the join endpoint
 * 3. Extract the userId from the registration response
 * 4. Retrieve the user profile using the userId
 * 5. Validate that email_verified is false for the newly created account
 */
export async function test_api_user_profile_verification_status_reflection(
  connection: api.IConnection,
) {
  // Step 1: Generate random user registration data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const referrerHref = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create a new user account via join endpoint
  const registrationBody = {
    email: userEmail,
    password: userPassword,
    href: currentHref,
    referrer: referrerHref,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedUser);

  // Step 3: Extract userId for profile retrieval
  const userId = authorizedUser.id;

  // Step 4: Retrieve the user profile using the userId
  const userProfile: ITodoListUser =
    await api.functional.todoList.user.users.at(connection, {
      userId: userId,
    });
  typia.assert(userProfile);

  // Step 5: Validate that email_verified is false for newly created account
  TestValidator.equals(
    "email_verified should be false for newly registered user",
    userProfile.email_verified,
    false,
  );

  // Step 6: Validate profile matches the registered user
  TestValidator.equals(
    "profile id should match authorized user id",
    userProfile.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "profile email should match registration email",
    userProfile.email,
    userEmail,
  );
}
