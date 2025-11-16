import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with realistic data
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://reddit.com/login",
    referrer: "https://google.com",
    ip: undefined, // ip is optional and can be omitted
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const authorized: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Step 2: Use the refresh token obtained to refresh authentication
  const refreshBody = {
    refreshToken: authorized.token.refresh,
  } satisfies IRedditCommunityRegisteredUser.IRefresh;

  const refreshed: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Step 3: Validate that the tokens differ, indicating a new token was issued
  TestValidator.notEquals(
    "access token should be refreshed",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
}
