import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_token_refresh_revoked_token(
  connection: api.IConnection,
) {
  // 1. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createResponse);

  // 2. Store the initial refresh token from registration
  const revokedRefreshToken = createResponse.token.refresh;

  // 3. Login to get a fresh set of tokens (simulating normal usage after registration)
  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/auth/login",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loginResponse);

  // 4. Simulate token revocation by attempting to use the original refresh token
  // In a real system, there would be a logout endpoint that revokes the token
  // For this test, we'll attempt to refresh with the old token and verify it fails
  await TestValidator.error(
    "revoked refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: revokedRefreshToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );

  // 5. Verify that a valid refresh token from the latest login still works
  const validRefreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: loginResponse.token.refresh,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(validRefreshResponse);

  // 6. Validate that the new tokens are valid and different from the previous ones
  TestValidator.notEquals(
    "new access token should differ from previous",
    validRefreshResponse.token.access,
    loginResponse.token.access,
  );
}
