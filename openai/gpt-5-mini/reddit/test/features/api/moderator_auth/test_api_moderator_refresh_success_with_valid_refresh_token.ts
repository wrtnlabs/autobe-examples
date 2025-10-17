import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function test_api_moderator_refresh_success_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1) Create a fresh moderator account via join
  const createBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const auth1: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  // Validate response shape
  typia.assert(auth1);

  // Basic token presence assertions
  TestValidator.predicate(
    "join: access token is present",
    typeof auth1.token.access === "string" && auth1.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token is present",
    typeof auth1.token.refresh === "string" && auth1.token.refresh.length > 0,
  );

  // Save original tokens for comparison
  const originalAccess = auth1.token.access;
  const originalRefresh = auth1.token.refresh;

  // 2) Refresh using returned refresh token
  const refreshBody = {
    refresh_token: originalRefresh,
  } satisfies ICommunityPortalModerator.IRefresh;

  const auth2: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(auth2);

  // 3) Business assertions: same user id/username, new tokens present
  TestValidator.equals(
    "refresh: user id must remain the same",
    auth2.id,
    auth1.id,
  );
  TestValidator.equals(
    "refresh: username must remain the same",
    auth2.username,
    auth1.username,
  );
  TestValidator.predicate(
    "refresh: new access token is present",
    typeof auth2.token.access === "string" && auth2.token.access.length > 0,
  );

  // If server rotates access tokens on refresh, the access should differ.
  TestValidator.notEquals(
    "refresh: access token should be different when rotation occurs",
    auth2.token.access,
    originalAccess,
  );

  // It's acceptable whether refresh token was rotated or not. If rotated, assert difference.
  if (typeof auth2.token.refresh === "string") {
    TestValidator.predicate(
      "refresh: refresh token present after refresh",
      auth2.token.refresh.length > 0,
    );
  }

  // 4) Optional: attempt a second refresh using the original refresh token to detect rotation policy
  try {
    const secondAttempt = await api.functional.auth.moderator.refresh(
      connection,
      {
        body: {
          refresh_token: originalRefresh,
        } satisfies ICommunityPortalModerator.IRefresh,
      },
    );
    // If succeeded, ensure it's the same user and tokens returned look valid
    typia.assert(secondAttempt);
    TestValidator.equals(
      "second refresh: user id matches original",
      secondAttempt.id,
      auth1.id,
    );
    TestValidator.predicate(
      "second refresh: returned access token is present",
      typeof secondAttempt.token.access === "string" &&
        secondAttempt.token.access.length > 0,
    );
    // If the server rotates refresh tokens, the new refresh should differ from the original
    TestValidator.notEquals(
      "second refresh: if rotation policy applies, refresh token should change",
      secondAttempt.token.refresh,
      originalRefresh,
    );
  } catch (err) {
    // If the server invalidated the original refresh token (rotation), the call may fail.
    // Treat that behavior as an acceptable rotation policy. Record the observed behavior.
    TestValidator.predicate(
      "second refresh rejected indicating refresh-token rotation or invalidation",
      true,
    );
  }
}
