import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful email verification token request for newly registered
 * moderator.
 *
 * This test validates the complete workflow of a moderator requesting email
 * verification after initial registration. The moderator account starts with
 * email_verified=false, and this operation generates a verification token that
 * will be sent to their email.
 *
 * Workflow:
 *
 * 1. Register a new moderator account (email_verified=false by default)
 * 2. Use the authentication token from registration
 * 3. Request email verification token
 * 4. Validate successful completion (void response indicates success)
 */
export async function test_api_moderator_email_verification_request_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with unverified email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Verify that the moderator was created with unverified email
  TestValidator.equals(
    "moderator email should be unverified initially",
    moderator.email_verified,
    false,
  );

  TestValidator.equals(
    "moderator email_verified_at should be null",
    moderator.email_verified_at,
    null,
  );

  // Step 2: Request email verification token (moderator is already authenticated from join)
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Step 3: Validate successful completion
  // The void return type indicates the operation completed successfully
  // The backend has created a verification record with:
  // - A cryptographically secure UUID token
  // - The moderator's ID
  // - A 24-hour expiration timestamp
  // - verified_at = null (not yet verified)
}
