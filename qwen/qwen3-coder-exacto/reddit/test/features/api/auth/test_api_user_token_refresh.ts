import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_token_refresh(connection: api.IConnection) {
  // Step 1: Create a new user account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const joinedUser = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(joinedUser);

  // Step 2: Authenticate the user to obtain initial tokens
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: loginInput,
  });
  typia.assert(loggedInUser);

  // Store the initial refresh token
  const initialRefreshToken = loggedInUser.token.refresh;

  // Step 3: Use the refresh token to obtain new tokens
  const refreshInput = {
    refreshToken: initialRefreshToken,
  } satisfies ICommunityForumCommunityUser.IRefresh;

  const refreshedUser = await api.functional.auth.user.refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshedUser);

  // Validation: Check that new tokens are different from the initial ones
  TestValidator.notEquals(
    "refresh token should be refreshed",
    initialRefreshToken,
    refreshedUser.token.refresh,
  );

  TestValidator.notEquals(
    "access token should be refreshed",
    loggedInUser.token.access,
    refreshedUser.token.access,
  );

  // Validation: Check that tokens have proper expiration times
  TestValidator.predicate("access token should have expiration time", () => {
    const expiredAt = new Date(refreshedUser.token.expired_at);
    return expiredAt instanceof Date && !isNaN(expiredAt.getTime());
  });

  TestValidator.predicate("refresh token should have expiration time", () => {
    const refreshableUntil = new Date(refreshedUser.token.refreshable_until);
    return (
      refreshableUntil instanceof Date && !isNaN(refreshableUntil.getTime())
    );
  });

  // Validation: Check that refresh token expiration is after access token expiration
  TestValidator.predicate(
    "refresh token should expire after access token",
    () => {
      const expiredAt = new Date(refreshedUser.token.expired_at);
      const refreshableUntil = new Date(refreshedUser.token.refreshable_until);
      return refreshableUntil.getTime() > expiredAt.getTime();
    },
  );
}
