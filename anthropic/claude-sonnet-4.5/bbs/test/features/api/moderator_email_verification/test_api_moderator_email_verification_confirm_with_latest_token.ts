import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test multiple email verification token requests for the same moderator.
 *
 * This test validates that the email verification system correctly handles
 * scenarios where a moderator requests multiple verification tokens. Due to API
 * limitations (no endpoint to retrieve moderator profile or access actual
 * tokens), this test validates:
 *
 * - Moderator account creation succeeds
 * - First email verification token request succeeds
 * - Second email verification token request succeeds (simulating re-request)
 * - Multiple token requests are accepted without errors
 *
 * Note: Full verification flow validation (checking email_verified status,
 * token states, and verified_at timestamps) cannot be tested without additional
 * API endpoints for retrieving moderator profile data and accessing
 * verification token information.
 *
 * Test Flow:
 *
 * 1. Create new moderator account with unverified email
 * 2. Request first email verification token
 * 3. Request second email verification token
 * 4. Validate all operations complete successfully
 */
export async function test_api_moderator_email_verification_confirm_with_latest_token(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Verify initial state: email should not be verified upon account creation
  TestValidator.equals(
    "email should not be verified initially",
    moderator.email_verified,
    false,
  );

  // Step 2: Request first email verification token
  // This simulates the initial verification email request
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Step 3: Request second email verification token
  // This simulates a user requesting verification email again
  // (e.g., didn't receive first email or token expired)
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Test validates that:
  // 1. Moderator account creation succeeds with email_verified=false
  // 2. First verification token request completes without error
  // 3. Second verification token request completes without error
  // 4. System accepts multiple token requests for the same moderator

  // Note: Cannot test actual verification confirmation because:
  // - No API endpoint to retrieve actual verification tokens from the system
  // - No API endpoint to retrieve updated moderator profile after verification
  // - Cannot validate email_verified status change without profile retrieval
  // - Cannot validate token states (verified_at timestamps) without token access API
}
