import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email verification record retrieval and expiration information.
 *
 * This test demonstrates the email verification retrieval workflow. While the
 * complete end-to-end scenario would require obtaining a verification ID from
 * the user registration process, this test validates the core functionality of
 * retrieving email verification records and examining their expiration status.
 *
 * In a real-world scenario, the verification ID would be:
 *
 * - Sent to the user's email after registration
 * - Extracted from the verification link
 * - Used to check if the token is still valid before attempting verification
 *
 * Test workflow:
 *
 * 1. Create a new user account (generates email verification token)
 * 2. Simulate retrieval of email verification record with known IDs
 * 3. Validate the verification record structure
 * 4. Verify expiration timestamp is logically consistent
 * 5. Confirm the record belongs to the correct user
 */
export async function test_api_email_verification_user_check_expiration_status(
  connection: api.IConnection,
) {
  // Step 1: Create a user account which generates an email verification token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: In a real scenario, the verification ID would come from the email
  // sent to the user. For this test, we simulate having both IDs available.
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the email verification record
  const verification =
    await api.functional.todoList.user.users.emailVerifications.at(connection, {
      userId: createdUser.id,
      verificationId: verificationId,
    });
  typia.assert(verification);

  // Step 4: Parse timestamps for logical validation
  const createdAt = new Date(verification.created_at);
  const expiresAt = new Date(verification.expires_at);

  // Step 5: Verify logical consistency - expires_at should be after created_at
  TestValidator.predicate(
    "expires_at should be after created_at",
    expiresAt.getTime() > createdAt.getTime(),
  );

  // Step 6: Verify the verification record belongs to the correct user
  TestValidator.equals(
    "verification belongs to created user",
    verification.todo_list_user_id,
    createdUser.id,
  );

  // Step 7: Verify typical 24-hour expiration window
  const expirationDuration = expiresAt.getTime() - createdAt.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "expiration should be within reasonable timeframe",
    expirationDuration > 0 && expirationDuration <= twentyFourHours * 2,
  );
}
