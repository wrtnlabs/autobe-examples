import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserRefresh";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate adminUser token refresh lifecycle around a newly joined admin.
 *
 * Business goal
 *
 * - Ensure that after an administrator joins, the refresh endpoint can be used
 *   with the initially issued refresh token to obtain a new set of JWT tokens.
 * - Confirm that the admin identity is stable across join and refresh calls, and
 *   that new token material is actually issued.
 *
 * Scenario steps
 *
 * 1. Register a new admin via POST /auth/adminUser/join, using a fully populated
 *    IDiscussionBoardAdminUserJoin.IRequest payload.
 * 2. Capture the returned IDiscussionBoardAdminuser.IAuthorized object as the
 *    baseline admin session, including its nested IAuthorizationToken.
 * 3. Immediately call POST /auth/adminUser/refresh with the previous refreshToken
 *    (IDiscussionBoardAdminUserRefresh.IRequest).
 * 4. Assert that:
 *
 *    - Both responses conform to IDiscussionBoardAdminuser.IAuthorized.
 *    - The admin id and email are identical between join and refresh responses.
 *    - The newly issued token.refresh differs from the original refresh token and is
 *         a non-empty string.
 */
export async function test_api_admin_user_token_refresh_after_account_status_change(
  connection: api.IConnection,
) {
  // 1. Build a realistic join request for an admin user.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.10",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  // 2. Join as a new admin user and validate the authorized payload.
  const joinedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedAdmin);

  // Sanity checks on the join response.
  TestValidator.predicate(
    "joined admin id must be a non-empty UUID string",
    () => joinedAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "joined admin email must match requested email",
    () => joinedAdmin.email === joinRequestBody.email,
  );
  TestValidator.predicate(
    "joined admin must contain a non-empty access token",
    () => joinedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined admin must contain a non-empty refresh token",
    () => joinedAdmin.token.refresh.length > 0,
  );

  const originalToken: IAuthorizationToken = joinedAdmin.token;

  // 3. Call refresh using the previously issued refresh token.
  const refreshRequestBody = {
    refreshToken: originalToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const refreshedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshedAdmin);

  const refreshedToken: IAuthorizationToken = refreshedAdmin.token;

  // 4-1. Identity stability: id and email must remain the same.
  TestValidator.equals(
    "admin id must remain stable across join and refresh",
    refreshedAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "admin email must remain stable across join and refresh",
    refreshedAdmin.email,
    joinedAdmin.email,
  );

  // 4-2. Token rotation: new refresh token should differ and be non-empty.
  TestValidator.notEquals(
    "refresh token should rotate on successful refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );
  TestValidator.predicate(
    "refreshed access token must be non-empty",
    () => refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty",
    () => refreshedToken.refresh.length > 0,
  );
}
