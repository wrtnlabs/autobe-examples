import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

export async function test_api_guest_refresh_valid_session(
  connection: api.IConnection,
) {
  // Create initial guest session by joining as a guest
  const guestCreate = {
    username: RandomGenerator.name(),
    user_agent: RandomGenerator.alphaNumeric(10),
  } satisfies IEconomicDiscussionGuest.ICreate;

  const initialGuest: IEconomicDiscussionGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreate,
    });
  typia.assert(initialGuest);

  // Record initial token information for comparison
  const initialAccessToken = initialGuest.token.access;
  const initialRefreshToken = initialGuest.token.refresh;
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;

  // Verify initial guest session data
  TestValidator.predicate(
    "initial guest ID should be a valid string",
    typeof initialGuest.id === "string",
  );
  TestValidator.equals(
    "initial username should match input",
    initialGuest.username,
    guestCreate.username,
  );
  TestValidator.predicate(
    "initial articles viewed count should be zero",
    initialGuest.articles_viewed_count === 0,
  );
  TestValidator.predicate(
    "initial downloads count should be zero",
    initialGuest.downloads_count === 0,
  );

  // Refresh the guest session using the refresh token
  const refreshRequest = {
    id: initialGuest.id,
  } satisfies IEconomicDiscussionGuest.IRefresh;

  const refreshedGuest: IEconomicDiscussionGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedGuest);

  // Verify refreshed session maintains guest identity
  TestValidator.equals(
    "refreshed guest ID should match original",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "refreshed username should match original",
    refreshedGuest.username,
    initialGuest.username,
  );
  TestValidator.equals(
    "refreshed articles viewed count should match original",
    refreshedGuest.articles_viewed_count,
    initialGuest.articles_viewed_count,
  );
  TestValidator.equals(
    "refreshed downloads count should match original",
    refreshedGuest.downloads_count,
    initialGuest.downloads_count,
  );

  // Verify token information was updated
  TestValidator.notEquals(
    "new access token should be different from initial",
    refreshedGuest.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should be different from initial",
    refreshedGuest.token.refresh,
    initialRefreshToken,
  );

  // Verify timestamps are updated (new tokens should have later expiration times)
  const originalExpiredTime = new Date(initialExpiredAt);
  const newExpiredTime = new Date(refreshedGuest.token.expired_at);
  TestValidator.predicate(
    "new token should expire later than original",
    newExpiredTime >= originalExpiredTime,
  );

  const originalRefreshableTime = new Date(initialRefreshableUntil);
  const newRefreshableTime = new Date(refreshedGuest.token.refreshable_until);
  TestValidator.predicate(
    "new refreshable until should be later than original",
    newRefreshableTime >= originalRefreshableTime,
  );

  // Verify connection headers were updated with new access token
  TestValidator.predicate(
    "connection should have authorization header",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "connection should use new access token",
    connection.headers?.Authorization,
    refreshedGuest.token.access,
  );
}
