import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test email verification request workflow for moderators.
 *
 * This test validates that moderators can successfully request email
 * verification after account creation. The test verifies:
 *
 * 1. Moderator account creation with valid credentials
 * 2. Successful authentication and session establishment
 * 3. Email verification request submission
 *
 * While the original scenario intended to test token reuse prevention, that
 * requires access to the verification token which is sent via email and not
 * accessible through the API. Therefore, this test focuses on the implementable
 * portions of the email verification workflow.
 *
 * Note: Token reuse testing would require backend/database access to retrieve
 * the generated verification token, which is beyond the scope of E2E API
 * testing.
 */
export async function test_api_moderator_email_verification_confirm_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with valid credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Step 2: Validate moderator account properties
  TestValidator.predicate(
    "moderator email should match registration email",
    moderator.email === moderatorEmail,
  );

  TestValidator.predicate(
    "moderator should not be email verified initially",
    moderator.email_verified === false,
  );

  TestValidator.predicate(
    "moderator account should be active",
    moderator.is_active === true,
  );

  // Step 3: Request email verification token
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Note: The verification token is sent via email and cannot be accessed through
  // the API. Testing token reuse would require backend access to retrieve the token,
  // which is not available in E2E testing scope. The email verification confirmation
  // endpoint exists but cannot be tested without the actual token from the email system.
}
