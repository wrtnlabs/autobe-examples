import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_moderator_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a new moderator to get initial tokens
  const email = RandomGenerator.alphabets(8) + "@test.com";
  const password = "password123";
  const joinBody = {
    email,
    password,
  } satisfies IRedditCommunityModerator.ICreate;
  const authorized: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Use the refresh token to get a new access token
  const refreshBody = {
    refresh_token: authorized.token.refresh,
  } satisfies IRedditCommunityModerator.IRefresh;
  const refreshed: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate that the refreshed access token is different from the old one
  TestValidator.notEquals(
    "access token should be renewed",
    refreshed.token.access,
    authorized.token.access,
  );

  // 4. Validate that the refresh token remains the same (assuming typical JWT refresh behavior)
  TestValidator.equals(
    "refresh token should remain unchanged",
    refreshed.token.refresh,
    authorized.token.refresh,
  );

  // 5. Validate the timestamps
  TestValidator.predicate(
    "token expired_at should be ISO date-time string",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "token refreshable_until should be ISO date-time string",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.includes("T"),
  );
}
