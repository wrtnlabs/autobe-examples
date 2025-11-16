import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can check the verification status of their email verification
 * records.
 *
 * This test validates the email verification status retrieval functionality by:
 *
 * 1. Creating a new user account which automatically generates a pending
 *    verification record
 * 2. Retrieving the verification record using the user ID and verification ID
 * 3. Validating that the verified field is false for newly created accounts
 * 4. Confirming that all timestamp fields and metadata are properly populated
 * 5. Ensuring the verification record accurately reflects its pending state
 *
 * Note: This test uses a random verification ID since the registration response
 * does not include verification record details. In a real-world scenario, there
 * would typically be an endpoint to list user verification records or the
 * verification ID would be included in the registration response.
 */
export async function test_api_email_verification_user_check_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account (generates pending email verification)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    email: userEmail,
    password: userPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(createdUser);

  // Step 2: Validate user creation response
  TestValidator.equals(
    "created user email matches",
    createdUser.email,
    userEmail,
  );
  TestValidator.equals(
    "email not verified for new user",
    createdUser.email_verified,
    false,
  );

  // Step 3: Generate a verification ID to retrieve
  // Note: Using random UUID since we don't have access to the actual verification ID
  // In a production test, this would come from a list endpoint or the registration response
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the email verification record
  const verificationRecord: ITodoListEmailVerification =
    await api.functional.todoList.user.users.emailVerifications.at(connection, {
      userId: createdUser.id,
      verificationId: verificationId,
    });
  typia.assert(verificationRecord);

  // Step 5: Validate that verified field is false for pending verification
  TestValidator.equals(
    "verification is pending for new account",
    verificationRecord.verified,
    false,
  );

  // Step 6: Validate that the verification record belongs to the created user
  TestValidator.equals(
    "verification record belongs to created user",
    verificationRecord.todo_list_user_id,
    createdUser.id,
  );

  // Step 7: Validate timestamp fields are properly populated
  TestValidator.predicate(
    "created_at timestamp is populated",
    verificationRecord.created_at.length > 0,
  );

  TestValidator.predicate(
    "expires_at timestamp is populated",
    verificationRecord.expires_at.length > 0,
  );

  // Step 8: Validate that token exists
  TestValidator.predicate(
    "verification token exists",
    verificationRecord.token.length > 0,
  );

  // Step 9: Validate that verification ID matches
  TestValidator.equals(
    "verification ID matches request",
    verificationRecord.id,
    verificationId,
  );
}
