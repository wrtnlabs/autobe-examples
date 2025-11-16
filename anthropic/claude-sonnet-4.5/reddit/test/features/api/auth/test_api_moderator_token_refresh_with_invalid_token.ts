import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test token refresh rejection when an invalid or malformed refresh token is
 * provided.
 *
 * This test validates that the token refresh mechanism properly rejects invalid
 * tokens and does not issue new authentication credentials. The test creates a
 * valid moderator account to ensure system context, then attempts to refresh
 * tokens using a completely invalid refresh token (random string that does not
 * represent a valid JWT).
 *
 * Expected behavior:
 *
 * 1. Moderator account creation succeeds (establishes valid system state)
 * 2. Token refresh with invalid token is rejected with authentication error
 * 3. No new access or refresh tokens are issued
 * 4. System properly validates token authenticity before processing
 *
 * This validates the security of the token refresh flow by ensuring only valid,
 * authentic refresh tokens can be used to obtain new credentials.
 */
export async function test_api_moderator_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account to establish system context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Attempt to refresh tokens using a completely invalid refresh token
  // Using a random alphanumeric string that does not represent a valid JWT
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);

  // Step 3: Verify that the refresh request is rejected with an error
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IRedditCommunityCommunityModerator.IRefresh,
      });
    },
  );
}
