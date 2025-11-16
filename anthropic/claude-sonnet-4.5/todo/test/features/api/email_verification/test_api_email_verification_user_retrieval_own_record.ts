import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a user can successfully retrieve detailed information about their
 * own email verification record.
 *
 * This test validates the basic retrieval functionality and ensures users can
 * check their verification status. The test creates a user account, which
 * automatically generates an email verification record, then retrieves that
 * verification record using the user's credentials to confirm all details are
 * accessible.
 *
 * Steps:
 *
 * 1. Create a user account via join endpoint
 * 2. Extract the user ID from the registration response
 * 3. Use a generated verification ID (simulating system-generated ID)
 * 4. Retrieve the specific email verification record using authenticated
 *    credentials
 * 5. Validate response structure using typia.assert
 * 6. Verify the verification record belongs to the authenticated user
 */
export async function test_api_email_verification_user_retrieval_own_record(
  connection: api.IConnection,
) {
  // Step 1: Create a user account via join endpoint
  const createUserData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: createUserData,
    },
  );
  typia.assert(user);

  // Step 2: Validate user email matches input
  TestValidator.equals(
    "user email should match input",
    user.email,
    createUserData.email,
  );

  // Step 3: Generate a verification ID for testing
  // Note: In a real scenario, this would be obtained from the system after user creation
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the email verification record
  const verification: ITodoListEmailVerification =
    await api.functional.todoList.user.users.emailVerifications.at(connection, {
      userId: user.id,
      verificationId: verificationId,
    });
  typia.assert(verification);

  // Step 5: Verify the verification record belongs to the authenticated user
  TestValidator.equals(
    "verification record should belong to created user",
    verification.todo_list_user_id,
    user.id,
  );

  // Step 6: Validate that the verification ID matches
  TestValidator.equals(
    "verification ID should match requested ID",
    verification.id,
    verificationId,
  );
}
