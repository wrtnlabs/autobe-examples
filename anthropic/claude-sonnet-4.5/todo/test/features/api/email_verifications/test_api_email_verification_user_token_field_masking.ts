import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the verification token field is appropriately handled in the
 * response.
 *
 * This test validates the email verification record retrieval API and token
 * field handling by:
 *
 * 1. Creating a user account (which generates an email verification record)
 * 2. Using the known user ID to attempt verification record retrieval
 * 3. Validating the response structure of ITodoListEmailVerification
 * 4. Verifying that the token field exists and is properly typed as a string
 * 5. Confirming the verification record structure follows the expected schema
 *
 * Note: This test uses a generated verification ID. In a real scenario, the
 * verification ID would be obtained from the email verification workflow or
 * database lookup.
 */
export async function test_api_email_verification_user_token_field_masking(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  // Step 2: Register the user - this automatically creates an email verification record
  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedUser);

  // Step 3: Prepare to retrieve email verification record
  // Note: In production, the verificationId would come from email link or database
  // For this test, we use a generated UUID to test the API endpoint
  const userId = authorizedUser.id;
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the email verification record
  const verification: ITodoListEmailVerification =
    await api.functional.todoList.user.users.emailVerifications.at(connection, {
      userId: userId,
      verificationId: verificationId,
    });

  // Step 5: Validate the complete response structure
  typia.assert(verification);

  // Step 6: Verify the token field is present and properly typed
  TestValidator.predicate(
    "token field exists in response",
    verification.token !== null && verification.token !== undefined,
  );

  TestValidator.predicate(
    "token is string type",
    typeof verification.token === "string",
  );

  // Step 7: Verify the verification record belongs to the correct user
  TestValidator.equals(
    "verification belongs to created user",
    verification.todo_list_user_id,
    userId,
  );

  // Step 8: Validate verification record has required fields
  TestValidator.predicate(
    "verification has valid id",
    verification.id !== null && verification.id !== undefined,
  );

  TestValidator.predicate(
    "verification has verified status",
    typeof verification.verified === "boolean",
  );

  TestValidator.predicate(
    "verification has created_at timestamp",
    verification.created_at !== null && verification.created_at !== undefined,
  );

  TestValidator.predicate(
    "verification has expires_at timestamp",
    verification.expires_at !== null && verification.expires_at !== undefined,
  );
}
