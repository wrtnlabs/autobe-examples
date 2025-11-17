import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a new user via join API with a unique, well-formed email and password
  const email: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string as string;
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // Validate token structure
  const { token } = authorizedUser;
  typia.assert<IAuthorizationToken>(token);

  // 2. Use the refresh token from the join response to call the refresh API
  const refreshBody = {
    refresh_token: token.refresh,
  } satisfies IRedditCommunityRegisteredUser.IRequestRefresh;
  const refreshedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  // Validate refreshed token structure
  const refreshedToken = refreshedUser.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // Validate that user data remains consistent
  TestValidator.equals(
    "user id remains the same",
    refreshedUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "user email remains the same",
    refreshedUser.email,
    authorizedUser.email,
  );

  // Validate that new access token differs from the old
  TestValidator.notEquals(
    "new access token differs",
    refreshedToken.access,
    token.access,
  );

  // Validate that refresh token is a string and not empty
  TestValidator.predicate(
    "refresh token is string and non-empty",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );

  // Validate token expiration timestamps are valid ISO date strings
  TestValidator.predicate(
    "expired_at is ISO string",
    !Number.isNaN(Date.parse(refreshedToken.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO string",
    !Number.isNaN(Date.parse(refreshedToken.refreshable_until)),
  );
}
