import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test password reset request rate limiting for moderator accounts.
 *
 * This test validates that the password reset endpoint enforces rate limiting
 * to prevent abuse and email flooding attacks. It creates a moderator account,
 * submits multiple consecutive password reset requests in rapid succession, and
 * verifies that rate limiting is enforced by rejecting excessive requests.
 *
 * Steps:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Submit multiple password reset requests rapidly
 * 3. Verify that rate limiting triggers an error after exceeding the threshold
 * 4. Confirm that the rate limiting mechanism prevents email flooding
 */
export async function test_api_moderator_password_reset_request_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with valid email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Submit multiple rapid password reset requests
  // The first few should succeed, then rate limiting should kick in
  let rateLimitTriggered = false;

  for (let i = 0; i < 10; i++) {
    try {
      const response: IRedditLikeModerator.IPasswordResetResponse =
        await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
          connection,
          {
            body: {
              email: moderatorEmail,
            } satisfies IRedditLikeModerator.IPasswordResetRequest,
          },
        );
      typia.assert(response);
      TestValidator.equals("request returns success", response.success, true);
    } catch (error) {
      rateLimitTriggered = true;
      break;
    }
  }

  // Step 3: Verify that rate limiting was enforced
  TestValidator.predicate(
    "rate limiting must trigger after multiple requests",
    rateLimitTriggered,
  );

  // Step 4: Confirm additional requests continue to be blocked
  await TestValidator.error(
    "subsequent requests after rate limit are rejected",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: moderatorEmail,
          } satisfies IRedditLikeModerator.IPasswordResetRequest,
        },
      );
    },
  );
}
