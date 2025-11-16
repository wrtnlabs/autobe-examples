import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_multiple_sequential_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Moderator login with credentials
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_password_123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Validate initial login response
  TestValidator.predicate(
    "login response should contain valid moderator ID",
    loginResponse.id !== null && loginResponse.id !== undefined,
  );
  TestValidator.predicate(
    "login response should contain authorization token",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );
  TestValidator.predicate(
    "login response should contain moderator information",
    loginResponse.moderator !== null && loginResponse.moderator !== undefined,
  );

  // Extract initial tokens from login response
  const initialAccessToken = loginResponse.token.access;
  const initialRefreshToken = loginResponse.token.refresh;
  const initialExpiredAt = loginResponse.token.expired_at;
  const initialRefreshableUntil = loginResponse.token.refreshable_until;

  // Step 2: First token refresh
  const firstRefreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const firstRefreshResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(firstRefreshResponse);

  // Validate first refresh response
  TestValidator.predicate(
    "first refresh should return new access token",
    firstRefreshResponse.token.access !== initialAccessToken,
  );
  TestValidator.predicate(
    "first refresh should return new refresh token",
    firstRefreshResponse.token.refresh !== initialRefreshToken,
  );
  TestValidator.predicate(
    "first refresh should update expiration time",
    firstRefreshResponse.token.expired_at !== initialExpiredAt,
  );

  // Extract tokens from first refresh
  const secondAccessToken = firstRefreshResponse.token.access;
  const secondRefreshToken = firstRefreshResponse.token.refresh;
  const secondExpiredAt = firstRefreshResponse.token.expired_at;

  // Step 3: Second sequential token refresh
  const secondRefreshBody = {
    refresh_token: secondRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const secondRefreshResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(secondRefreshResponse);

  // Validate second refresh response
  TestValidator.predicate(
    "second refresh should return new access token",
    secondRefreshResponse.token.access !== secondAccessToken,
  );
  TestValidator.predicate(
    "second refresh should return new refresh token",
    secondRefreshResponse.token.refresh !== secondRefreshToken,
  );
  TestValidator.predicate(
    "second refresh should update expiration time",
    secondRefreshResponse.token.expired_at !== secondExpiredAt,
  );

  // Validate continuous authentication
  TestValidator.predicate(
    "moderator ID should remain consistent across refreshes",
    secondRefreshResponse.id === loginResponse.id,
  );
  TestValidator.predicate(
    "moderator information should remain consistent",
    secondRefreshResponse.moderator.id === loginResponse.moderator.id,
  );
  TestValidator.predicate(
    "moderator account status should remain active",
    secondRefreshResponse.moderator.account_status === "active",
  );

  // Validate token structure
  TestValidator.predicate(
    "access token should be a non-empty string",
    secondRefreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    secondRefreshResponse.token.refresh.length > 0,
  );
}
