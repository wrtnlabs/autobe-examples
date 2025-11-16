import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test password reset request with a valid moderator email address.
 *
 * This test validates the password reset request flow for moderator accounts.
 * It creates a new moderator account, then requests a password reset using the
 * registered email address. The test verifies that the API returns a generic
 * success message confirming that the password reset process has been
 * initiated, which prevents email enumeration attacks by not revealing whether
 * an email exists in the system.
 *
 * The test workflow:
 *
 * 1. Create a moderator account with a valid email address
 * 2. Request a password reset using that email address
 * 3. Validate the response contains a confirmation message
 * 4. Ensure the response structure matches the expected API contract
 */
export async function test_api_moderator_password_reset_valid_email(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorCreateBody = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com/auth",
  } satisfies ICommunityPlatformModerator.ICreate;

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(createdModerator);

  // Step 2: Request password reset using the registered email
  const passwordResetRequestBody = {
    email: moderatorEmail,
  } satisfies ICommunityPlatformModerator.IPasswordResetRequest;

  const resetResponse: ICommunityPlatformModerator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: passwordResetRequestBody,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate the response contains a meaningful confirmation message
  TestValidator.predicate(
    "password reset response should contain a non-empty message",
    resetResponse.message.length > 0,
  );
}
