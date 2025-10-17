import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_refresh_token_expired(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "SecurePassword123!",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Log in to obtain access and refresh tokens
  const loginData = {
    email: moderatorData.email,
    password: moderatorData.password,
  } satisfies ICommunityPlatformModerator.ILogin;

  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(loginResponse);

  // 3. Wait beyond refresh token expiration period (assume 1 minute expiration)
  // Convert refreshable_until to Date and add 2 minutes to ensure expiration
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const expirationTime = refreshableUntil.getTime() + 2 * 60 * 1000; // 2 minutes

  // Wait until expiration time
  const currentTime = Date.now();
  if (currentTime < expirationTime) {
    await new Promise((resolve) =>
      setTimeout(resolve, expirationTime - currentTime),
    );
  }

  // 4. Attempt refresh with expired token (should fail)
  // The refresh endpoint expects an empty object per IRefresh type
  const emptyRefresh: ICommunityPlatformModerator.IRefresh = {};

  // The refresh token is stored in an HTTP-only cookie
  // The SDK automatically uses the cookie from previous login
  // When the refresh token is expired, the backend should return HTTP 401 or similar
  await TestValidator.error(
    "refresh should fail with expired token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: emptyRefresh,
      });
    },
  );
}
