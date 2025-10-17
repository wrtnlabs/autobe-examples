import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new guest user with unique nickname
  const nickname = `guest_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = { nickname } satisfies ITodoListGuest.ICreate;
  const guestAuthorized = await api.functional.auth.guest.join.joinGuest(
    connection,
    { body: createBody },
  );
  typia.assert(guestAuthorized);

  // 2. Use the refresh token from the join response to request new tokens
  const refreshBody = {
    refresh_token: guestAuthorized.token.refresh,
  } satisfies ITodoListGuest.IRefresh;
  const refreshedAuthorized =
    await api.functional.auth.guest.refresh.refreshGuest(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);

  // 3. Validate that new tokens are fresh and user details match
  TestValidator.predicate(
    "access token changed after refresh",
    guestAuthorized.token.access !== refreshedAuthorized.token.access,
  );
  TestValidator.equals(
    "user id remains the same",
    refreshedAuthorized.id,
    guestAuthorized.id,
  );
  TestValidator.equals(
    "nickname remains the same",
    refreshedAuthorized.nickname,
    guestAuthorized.nickname,
  );
  TestValidator.predicate(
    "refresh token changed after refresh",
    guestAuthorized.token.refresh !== refreshedAuthorized.token.refresh,
  );
  TestValidator.predicate(
    "new expired_at is in future",
    new Date(refreshedAuthorized.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "new refreshable_until is in future",
    new Date(refreshedAuthorized.token.refreshable_until).getTime() >
      Date.now(),
  );
}
