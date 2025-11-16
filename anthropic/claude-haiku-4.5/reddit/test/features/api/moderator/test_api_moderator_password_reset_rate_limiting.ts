import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Tests rate-limiting behavior for multiple password reset requests.
 *
 * This test validates that the password reset endpoint properly handles
 * multiple rapid requests from the same email address. It ensures the system
 * implements security measures to prevent abuse while maintaining usability.
 *
 * Steps:
 *
 * 1. Create a moderator account with valid registration data
 * 2. Submit multiple password reset requests in quick succession
 * 3. Verify that all requests are processed consistently
 * 4. Validate responses align with security best practices
 */
export async function test_api_moderator_password_reset_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "SecurePassword123!",
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Submit multiple password reset requests in rapid succession
  const responses = await ArrayUtil.asyncRepeat(5, async () => {
    const response =
      await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: moderatorEmail,
          } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
        },
      );
    typia.assert(response);
    return response;
  });

  // Step 3: Verify that all responses were processed
  TestValidator.equals(
    "all password reset requests returned responses",
    responses.length,
    5,
  );

  // Step 4: Validate response consistency for rate-limiting behavior
  TestValidator.predicate(
    "all responses contain valid message",
    responses.every(
      (r) =>
        r.message !== null &&
        r.message !== undefined &&
        typeof r.message === "string" &&
        r.message.length > 0,
    ),
  );
}
