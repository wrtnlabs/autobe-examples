import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_login_existing_user(
  connection: api.IConnection,
) {
  // 1. Generate random but valid community moderator creation info
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  // 2. Call join endpoint to create a new community moderator
  const joinResult =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: joinData,
      },
    );

  // 3. Validate join result with typia
  typia.assert(joinResult);

  // 4. Prepare login data using the same credentials
  const loginData = {
    email: joinData.email,
    password: joinData.password,
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  // 5. Call login endpoint
  const loginResult =
    await api.functional.auth.communityModerator.login.loginCommunityModerator(
      connection,
      {
        body: loginData,
      },
    );

  // 6. Validate login result with typia
  typia.assert(loginResult);

  // 7. Validate that the login email equals join email
  TestValidator.equals(
    "login email matches join email",
    loginResult.email,
    joinData.email,
  );

  // 8. Validate presence of access token string
  TestValidator.predicate(
    "login access token is a non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  // 9. Validate presence of refresh token string
  TestValidator.predicate(
    "login refresh token is a non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  // 10. Validate token expiry timestamps are ISO 8601 strings
  TestValidator.predicate(
    "login token expired_at is ISO 8601 string",
    typeof loginResult.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?Z$/.test(
        loginResult.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "login token refreshable_until is ISO 8601 string",
    typeof loginResult.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?Z$/.test(
        loginResult.token.refreshable_until,
      ),
  );
}
