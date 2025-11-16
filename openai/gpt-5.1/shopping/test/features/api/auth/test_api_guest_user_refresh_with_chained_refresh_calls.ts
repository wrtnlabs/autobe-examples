import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";
import type { IShoppingMallGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserRefresh";

export async function test_api_guest_user_refresh_with_chained_refresh_calls(
  connection: api.IConnection,
) {
  // 1. Record baseline time for lifetime checks
  const baselineMs: number = Date.now();

  // 2. Guest joins to obtain initial authorized session
  const joinBody = typia.random<IShoppingMallGuestUserJoin.IRequest>();

  const session0: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(session0);

  // 3. First refresh using initial refresh token
  const refreshBody1 = {
    refreshToken: session0.token.refresh,
  } satisfies IShoppingMallGuestUserRefresh.IRequest;

  const session1: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(session1);

  // 4. Second refresh, chaining from the first refresh's refresh token
  const refreshBody2 = {
    refreshToken: session1.token.refresh,
  } satisfies IShoppingMallGuestUserRefresh.IRequest;

  const session2: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(session2);

  // 5. Identity stability: id remains consistent across join and both refreshes
  TestValidator.equals(
    "guest id must remain stable across join and chained refreshes (session0 vs session1)",
    session0.id,
    session1.id,
  );
  TestValidator.equals(
    "guest id must remain stable across join and chained refreshes (session1 vs session2)",
    session1.id,
    session2.id,
  );

  // 6. Identity stability: temporary_identifier remains consistent
  TestValidator.equals(
    "temporary_identifier must remain stable across join and chained refreshes (session0 vs session1)",
    session0.temporary_identifier,
    session1.temporary_identifier,
  );
  TestValidator.equals(
    "temporary_identifier must remain stable across join and chained refreshes (session1 vs session2)",
    session1.temporary_identifier,
    session2.temporary_identifier,
  );

  // 7. Access token rotation: access tokens should change on each refresh
  TestValidator.notEquals(
    "access token should be rotated on first refresh (session0 vs session1)",
    session0.token.access,
    session1.token.access,
  );
  TestValidator.notEquals(
    "access token should be rotated on second refresh (session1 vs session2)",
    session1.token.access,
    session2.token.access,
  );

  // 8. Lifetime checks: expired_at and refreshable_until should be in the future
  const expired0: number = new Date(session0.token.expired_at).getTime();
  const expired1: number = new Date(session1.token.expired_at).getTime();
  const expired2: number = new Date(session2.token.expired_at).getTime();

  const refreshable0: number = new Date(
    session0.token.refreshable_until,
  ).getTime();
  const refreshable1: number = new Date(
    session1.token.refreshable_until,
  ).getTime();
  const refreshable2: number = new Date(
    session2.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "initial access token expiry must be in the future relative to baseline",
    expired0 > baselineMs,
  );
  TestValidator.predicate(
    "first refresh access token expiry must be in the future relative to baseline",
    expired1 > baselineMs,
  );
  TestValidator.predicate(
    "second refresh access token expiry must be in the future relative to baseline",
    expired2 > baselineMs,
  );

  TestValidator.predicate(
    "initial refresh token lifetime must extend into the future relative to baseline",
    refreshable0 > baselineMs,
  );
  TestValidator.predicate(
    "first refresh token lifetime must extend into the future relative to baseline",
    refreshable1 > baselineMs,
  );
  TestValidator.predicate(
    "second refresh token lifetime must extend into the future relative to baseline",
    refreshable2 > baselineMs,
  );

  // 9. Monotonic lifetime progression (non-decreasing expirations)
  TestValidator.predicate(
    "access token expiry should not move backwards between session0 and session1",
    expired1 >= expired0,
  );
  TestValidator.predicate(
    "access token expiry should not move backwards between session1 and session2",
    expired2 >= expired1,
  );

  TestValidator.predicate(
    "refresh token refreshable_until should not move backwards between session0 and session1",
    refreshable1 >= refreshable0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until should not move backwards between session1 and session2",
    refreshable2 >= refreshable1,
  );
}
