import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify token refresh immediately after member user registration.
 *
 * This E2E test ensures that a freshly registered member user can successfully
 * refresh their authentication tokens using the `/auth/memberUser/refresh`
 * endpoint. It validates that the refresh flow preserves member identity and
 * issues a valid new authorization token structure.
 *
 * Business flow:
 *
 * 1. Register a new member user with POST /auth/memberUser/join using a unique
 *    email, valid password, and realistic href/referrer.
 * 2. Confirm that the join response conforms to `ITodoAppMemberuser.IAuthorized`
 *    and extract the refresh token.
 * 3. Call POST /auth/memberUser/refresh with `ITodoAppMemberUserRefresh.IRequest`
 *    using the extracted refresh token.
 * 4. Validate that the refresh response is also a valid
 *    `ITodoAppMemberuser.IAuthorized` instance.
 * 5. Ensure the member identity fields (id, email, status, etc.) are preserved
 *    between the original and refreshed contexts and that the account remains
 *    in an authenticable state (no unexpected status changes and deleted_at
 *    remains null/undefined).
 * 6. Confirm that token objects from both responses look structurally correct via
 *    `typia.assert`, and that the refresh issues a new access token value
 *    relative to the original one.
 */
export async function test_api_member_user_token_refresh_after_join(
  connection: api.IConnection,
) {
  // 1. Join a new member user with realistic registration data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(joined);

  // Sanity-check basic identity invariants from the join response
  TestValidator.predicate(
    "joined member id should be a non-empty uuid string",
    () => joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined member email should equal requested email",
    () => joined.email === joinBody.email,
  );

  // 2. Extract the refresh token from the join response
  const originalToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(originalToken);

  TestValidator.predicate(
    "original access token string should be non-empty",
    () => originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "original refresh token string should be non-empty",
    () => originalToken.refresh.length > 0,
  );

  // 3. Call refresh API using the refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ITodoAppMemberUserRefresh.IRequest;

  const refreshed: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 4. Identity must be preserved between join and refresh
  TestValidator.equals(
    "refreshed member id should equal joined member id",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refreshed member email should equal joined member email",
    refreshed.email,
    joined.email,
  );

  TestValidator.equals(
    "account status should remain unchanged after refresh",
    refreshed.status,
    joined.status,
  );

  TestValidator.equals(
    "failed_login_count should be stable across refresh",
    refreshed.failed_login_count,
    joined.failed_login_count,
  );

  // last_login_at and deleted_at are nullable/undefinable; we only
  // ensure that logical deletion has not been introduced by refresh.
  TestValidator.equals(
    "deleted_at should not become non-null due to refresh",
    refreshed.deleted_at ?? null,
    joined.deleted_at ?? null,
  );

  // 5. Token structure correctness is already ensured by typia.assert,
  // but we add a simple business check that refresh rotates access token.
  TestValidator.predicate(
    "refreshed access token should differ from original access token",
    () => refreshedToken.access !== originalToken.access,
  );
}
