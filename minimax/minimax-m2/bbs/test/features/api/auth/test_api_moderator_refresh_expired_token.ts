import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
) {
  // 1. Register a content moderator account to obtain valid authentication tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: moderatorEmail,
        password: "SecurePass123!",
        bio: "Experienced content moderator specializing in economic and political discussions",
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://moderator.example.com/dashboard",
        referrer: "https://admin.example.com/moderators",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Extract the refresh token from the initial authentication response
  const refreshToken = moderator.token.refresh;

  // 3. Simulate expired refresh token by attempting to use a clearly invalid/expired token
  // In a real scenario, this would be a token that has exceeded its refreshable_until timestamp
  const expiredRefreshToken =
    "expired_refresh_token_" + RandomGenerator.alphaNumeric(32);

  // 4. Attempt to refresh session with the expired/invalid refresh token
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.contentModerator.refresh.renewSession(
        connection,
        {
          body: {
            refreshToken: expiredRefreshToken,
          } satisfies IEconPoliticalDiscussionContentModerator.IRefresh,
        },
      );
    },
  );

  // 5. Verify that the moderator's session token remains unchanged after failed refresh
  // The original tokens should not be updated when refresh fails
  TestValidator.equals(
    "original access token remains unchanged after failed refresh",
    connection.headers?.Authorization,
    `Bearer ${moderator.token.access}`,
  );
}
