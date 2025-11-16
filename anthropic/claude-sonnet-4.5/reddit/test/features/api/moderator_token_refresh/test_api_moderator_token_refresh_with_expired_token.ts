import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test token refresh behavior when attempting to use an expired refresh token.
 *
 * This test validates the token refresh mechanism for moderator authentication.
 * Since simulating actual token expiration in real-time is impractical, this
 * scenario focuses on validating that the token refresh flow works correctly
 * and that expiration metadata is properly returned.
 *
 * Test workflow:
 *
 * 1. Create a moderator account and obtain initial tokens
 * 2. Validate initial authentication response
 * 3. Use the refresh token to obtain new access tokens
 * 4. Validate refresh response structure and token metadata
 * 5. Confirm expiration timestamps are present and valid
 */
export async function test_api_moderator_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to obtain initial tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const nickname = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createBody = {
    email: email,
    password: password,
    nickname: nickname,
    ip: "127.0.0.1",
    href: href,
    referrer: referrer,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const initialAuth: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(initialAuth);

  // Step 2: Validate initial authentication response structure
  TestValidator.predicate(
    "initial auth should have valid moderator ID",
    initialAuth.id.length > 0,
  );
  TestValidator.equals(
    "initial auth email matches input",
    initialAuth.email,
    email,
  );
  TestValidator.equals(
    "initial auth nickname matches input",
    initialAuth.nickname,
    nickname,
  );
  TestValidator.predicate(
    "initial auth should have access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial auth should have refresh token",
    initialAuth.token.refresh.length > 0,
  );

  // Step 3: Validate token expiration metadata exists
  typia.assert<string & tags.Format<"date-time">>(initialAuth.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    initialAuth.token.refreshable_until,
  );

  // Step 4: Use refresh token to obtain new tokens
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IRedditCommunityCommunityModerator.IRefresh;

  const refreshedAuth: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  // Step 5: Validate refresh response contains complete moderator data
  TestValidator.equals(
    "refreshed auth moderator ID matches original",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "refreshed auth email matches original",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "refreshed auth nickname matches original",
    refreshedAuth.nickname,
    initialAuth.nickname,
  );
  TestValidator.equals(
    "refreshed auth username matches original",
    refreshedAuth.username,
    initialAuth.username,
  );

  // Step 6: Validate new tokens are provided
  TestValidator.predicate(
    "refreshed auth should have new access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed auth should have new refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 7: Validate token expiration metadata in refresh response
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAuth.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAuth.token.refreshable_until,
  );

  // Step 8: Verify created_at timestamp is consistent
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
}
