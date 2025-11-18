import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_token_refresh_new_tokens_differ(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account and get initial tokens
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphabets(12);

  const initialAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(initialAuth);

  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;

  TestValidator.predicate(
    "initial tokens should be non-empty strings",
    initialAccessToken.length > 0 && initialRefreshToken.length > 0,
  );

  // Step 2: Perform first refresh operation
  const firstRefresh: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  const firstAccessToken = firstRefresh.token.access;
  const firstRefreshToken = firstRefresh.token.refresh;

  TestValidator.notEquals(
    "first refresh should return different access token",
    initialAccessToken,
    firstAccessToken,
  );

  TestValidator.notEquals(
    "first refresh should return different refresh token",
    initialRefreshToken,
    firstRefreshToken,
  );

  // Step 3: Perform second refresh operation
  const secondRefresh: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(secondRefresh);

  const secondAccessToken = secondRefresh.token.access;
  const secondRefreshToken = secondRefresh.token.refresh;

  TestValidator.notEquals(
    "second refresh should return different access token from first",
    firstAccessToken,
    secondAccessToken,
  );

  TestValidator.notEquals(
    "second refresh should return different refresh token from first",
    firstRefreshToken,
    secondRefreshToken,
  );

  // Step 4: Verify all tokens across cycles are different
  TestValidator.notEquals(
    "second access token should differ from initial",
    initialAccessToken,
    secondAccessToken,
  );

  TestValidator.notEquals(
    "second refresh token should differ from initial",
    initialRefreshToken,
    secondRefreshToken,
  );

  // Step 5: Perform third refresh to ensure consistent rotation pattern
  const thirdRefresh: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: secondRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(thirdRefresh);

  const thirdAccessToken = thirdRefresh.token.access;
  const thirdRefreshToken = thirdRefresh.token.refresh;

  TestValidator.notEquals(
    "third refresh should return different access token from second",
    secondAccessToken,
    thirdAccessToken,
  );

  TestValidator.notEquals(
    "third refresh should return different refresh token from second",
    secondRefreshToken,
    thirdRefreshToken,
  );

  // Step 6: Verify all unique tokens across three refresh cycles
  const allAccessTokens = [
    initialAccessToken,
    firstAccessToken,
    secondAccessToken,
    thirdAccessToken,
  ];

  const allRefreshTokens = [
    initialRefreshToken,
    firstRefreshToken,
    secondRefreshToken,
    thirdRefreshToken,
  ];

  TestValidator.predicate(
    "all access tokens should be unique",
    allAccessTokens.every(
      (token, index) => allAccessTokens.indexOf(token) === index,
    ),
  );

  TestValidator.predicate(
    "all refresh tokens should be unique",
    allRefreshTokens.every(
      (token, index) => allRefreshTokens.indexOf(token) === index,
    ),
  );

  // Step 7: Verify token expiration timestamps are valid and different
  TestValidator.notEquals(
    "access token expiration should differ across refreshes",
    initialAuth.token.expired_at,
    firstRefresh.token.expired_at,
  );

  TestValidator.notEquals(
    "refresh token expiration should differ across refreshes",
    initialAuth.token.refreshable_until,
    firstRefresh.token.refreshable_until,
  );
}
