import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserRefresh";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Verify that an authenticated administrative user can successfully refresh JWT
 * tokens.
 *
 * Business flow:
 *
 * 1. Register (join) a new adminUser account using valid join payload.
 * 2. Capture the initial IDiscussionBoardAdminuser.IAuthorized response including
 *    token info.
 * 3. Call the /auth/adminUser/refresh endpoint with the initial refreshToken.
 * 4. Validate that the refreshed authorized payload keeps the same
 *    identity/profile fields.
 * 5. Validate that the token set is rotated: access/refresh tokens are non-empty
 *    and at least one differs.
 * 6. Validate that token expiry-related fields are valid ISO date-time strings and
 *    not earlier than originals (practically, we just ensure they are non-empty
 *    because typia.assert already validates format).
 * 7. Perform a second refresh using the newly issued refreshToken to confirm that
 *    the refreshed session is usable.
 */
export async function test_api_admin_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new administrative user (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const firstAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(firstAuthorized);

  const firstToken: IAuthorizationToken = firstAuthorized.token;
  typia.assert(firstToken);

  TestValidator.predicate(
    "initial access token must be non-empty",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token must be non-empty",
    firstToken.refresh.length > 0,
  );

  // 2. First refresh using the initial refresh token
  const firstRefreshBody = {
    refreshToken: firstToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const secondAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(secondAuthorized);

  const secondToken: IAuthorizationToken = secondAuthorized.token;
  typia.assert(secondToken);

  // 3. Identity/profile consistency checks
  TestValidator.equals(
    "admin id should remain the same after first refresh",
    secondAuthorized.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "admin email should remain the same after first refresh",
    secondAuthorized.email,
    firstAuthorized.email,
  );
  TestValidator.equals(
    "admin loginId should remain the same after first refresh",
    secondAuthorized.loginId,
    firstAuthorized.loginId,
  );
  TestValidator.equals(
    "admin displayName should remain the same after first refresh",
    secondAuthorized.displayName,
    firstAuthorized.displayName,
  );
  TestValidator.equals(
    "admin role should remain the same after first refresh",
    secondAuthorized.role,
    firstAuthorized.role,
  );
  TestValidator.equals(
    "admin status should remain the same after first refresh",
    secondAuthorized.status,
    firstAuthorized.status,
  );
  TestValidator.equals(
    "admin emailVerified should remain the same after first refresh",
    secondAuthorized.emailVerified,
    firstAuthorized.emailVerified,
  );
  TestValidator.equals(
    "admin createdAt should remain the same after first refresh",
    secondAuthorized.createdAt,
    firstAuthorized.createdAt,
  );

  // updatedAt may or may not change on refresh; allow either equality or just ensure it is non-empty.
  TestValidator.predicate(
    "admin updatedAt should be non-empty after first refresh",
    secondAuthorized.updatedAt.length > 0,
  );

  // 4. Token rotation checks for first refresh
  TestValidator.predicate(
    "refreshed access token must be non-empty",
    secondToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty",
    secondToken.refresh.length > 0,
  );

  TestValidator.predicate(
    "at least one of access or refresh tokens should change after first refresh",
    secondToken.access !== firstToken.access ||
      secondToken.refresh !== firstToken.refresh,
  );

  // Expiry timestamps should be non-empty; typia.assert already validated ISO date-time format.
  TestValidator.predicate(
    "expired_at should be non-empty after first refresh",
    secondToken.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be non-empty after first refresh",
    secondToken.refreshable_until.length > 0,
  );

  // 5. Second refresh using the newly issued refresh token to ensure session remains valid
  const secondRefreshBody = {
    refreshToken: secondToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const thirdAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(thirdAuthorized);

  const thirdToken: IAuthorizationToken = thirdAuthorized.token;
  typia.assert(thirdToken);

  // Identity should remain stable across all refresh chains
  TestValidator.equals(
    "admin id should remain the same after second refresh",
    thirdAuthorized.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "admin email should remain the same after second refresh",
    thirdAuthorized.email,
    firstAuthorized.email,
  );
  TestValidator.equals(
    "admin loginId should remain the same after second refresh",
    thirdAuthorized.loginId,
    firstAuthorized.loginId,
  );
  TestValidator.equals(
    "admin displayName should remain the same after second refresh",
    thirdAuthorized.displayName,
    firstAuthorized.displayName,
  );
  TestValidator.equals(
    "admin role should remain the same after second refresh",
    thirdAuthorized.role,
    firstAuthorized.role,
  );
  TestValidator.equals(
    "admin status should remain the same after second refresh",
    thirdAuthorized.status,
    firstAuthorized.status,
  );
  TestValidator.equals(
    "admin emailVerified should remain the same after second refresh",
    thirdAuthorized.emailVerified,
    firstAuthorized.emailVerified,
  );

  // Token checks for second refresh
  TestValidator.predicate(
    "second refreshed access token must be non-empty",
    thirdToken.access.length > 0,
  );
  TestValidator.predicate(
    "second refreshed refresh token must be non-empty",
    thirdToken.refresh.length > 0,
  );

  TestValidator.predicate(
    "at least one of access or refresh tokens should change on second refresh",
    thirdToken.access !== secondToken.access ||
      thirdToken.refresh !== secondToken.refresh,
  );

  TestValidator.predicate(
    "expired_at should be non-empty after second refresh",
    thirdToken.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be non-empty after second refresh",
    thirdToken.refreshable_until.length > 0,
  );
}
