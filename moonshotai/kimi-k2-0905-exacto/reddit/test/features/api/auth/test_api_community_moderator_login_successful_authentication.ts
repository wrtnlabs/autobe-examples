import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for login testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/auth/register",
        referrer: "https://reddit-community.example.com/",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Switch to unauthenticated connection for login test
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Perform login with valid credentials
  const loginResponse: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(loginConnection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://reddit-community.example.com/auth/login",
        referrer: "https://reddit-community.example.com/",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Step 4: Validate authentication tokens
  TestValidator.equals(
    "login response has valid token structure",
    !!loginResponse.token.access &&
      !!loginResponse.token.refresh &&
      !!loginResponse.token.expired_at &&
      !!loginResponse.token.refreshable_until,
    true,
  );

  // Step 5: Verify Authorization header was updated
  TestValidator.equals(
    "connection authorization header updated",
    loginConnection.headers?.Authorization,
    loginResponse.token.access,
  );

  // Step 6: Validate moderator profile data
  TestValidator.equals(
    "moderator email matches login",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator ID matches registration",
    loginResponse.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator nickname matches registration",
    loginResponse.nickname,
    moderator.nickname,
  );
  TestValidator.equals(
    "moderator created_at matches registration",
    loginResponse.created_at,
    moderator.created_at,
  );

  // Validate timestamp format
  TestValidator.predicate(
    "token expired_at is valid ISO datetime",
    () =>
      new Date(loginResponse.token.expired_at).toISOString() ===
      loginResponse.token.expired_at,
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO datetime",
    () =>
      new Date(loginResponse.token.refreshable_until).toISOString() ===
      loginResponse.token.refreshable_until,
  );
}
