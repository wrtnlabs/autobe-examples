import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorRefresh";

export async function test_api_community_moderator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  /**
   * Verify refresh denial when an invalid or malformed refresh token is
   * supplied.
   *
   * Steps:
   *
   * 1. Register a new communityModerator user via join to ensure baseline user
   *    context exists.
   * 2. Call POST /auth/communityModerator/refresh with an obviously invalid
   *    refresh token string.
   * 3. Assert that the call fails (error thrown) and no new tokens are issued by
   *    the server.
   * 4. Repeat with another malformed token to confirm consistent denial behavior.
   *
   * Notes:
   *
   * - We do not assert specific HTTP status codes or error messages; only that an
   *   error occurs.
   * - We never touch connection.headers; the SDK manages headers automatically.
   */

  // 1) Register a new communityModerator user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // 3-20 chars, [A-Za-z0-9_]; lowercase alphanum fits pattern
    // Ensure password includes >=1 letter and >=1 digit by construction
    password: `A${RandomGenerator.alphaNumeric(6)}1${RandomGenerator.alphaNumeric(6)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const authorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized);

  // 2) Attempt refresh with an invalid token
  const invalidToken1 = "invalid.refresh.token";
  await TestValidator.error(
    "refresh must fail with invalid token (obvious malformed string)",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: {
          refresh_token: invalidToken1,
        } satisfies ICommunityPlatformCommunityModeratorRefresh.IRequest,
      });
    },
  );

  // 4) Attempt refresh again with another malformed token to confirm consistent denial
  const invalidToken2 = RandomGenerator.alphaNumeric(96);
  await TestValidator.error(
    "refresh must fail with invalid token (random alphanumeric string)",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: {
          refresh_token: invalidToken2,
        } satisfies ICommunityPlatformCommunityModeratorRefresh.IRequest,
      });
    },
  );
}
