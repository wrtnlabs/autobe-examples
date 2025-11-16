import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Ensure community moderator token refresh returns a new token bundle for the
 * same moderator actor.
 *
 * Original human scenario requested verifying that refresh is blocked when
 * account_status_id is changed to a disallowed status (suspended/banned).
 * However, the provided SDK exposes only two endpoints:
 *
 * - POST /auth/communityModerator/join
 * - POST /auth/communityModerator/refresh and no API to mutate account_status_id
 *   or deleted_at, nor any variant of refresh that returns an error response
 *   type. Therefore we instead validate the successful refresh behavior for an
 *   active moderator.
 *
 * Business flow implemented here:
 *
 * 1. Register a new community moderator using join(), producing an
 *    ICommunityPlatformCommunityModerator.IAuthorized payload that contains an
 *    IAuthorizationToken bundle (access/refresh/expired_at/refreshable_until).
 * 2. Extract the initial refresh token from the join response.
 * 3. Call refresh() with that refresh token using
 *    ICommunityPlatformCommunityModerator.IRefresh as the request body.
 * 4. Assert that:
 *
 *    - The response is structurally valid (typia.assert on IAuthorized).
 *    - The moderator id in the refreshed payload matches the original id (same
 *         moderator actor).
 *    - The new access token differs from the old one, indicating rotation.
 *    - The new refresh token differs from the old one.
 *    - The expiry-related timestamps in IAuthorizationToken change.
 *
 * This test focuses purely on positive-path token lifecycle behavior using the
 * available APIs and DTOs, while respecting the constraints that tests must not
 * manipulate connection.headers directly or assume any additional backend
 * endpoints beyond those provided.
 */
export async function test_api_community_moderator_token_refresh_after_account_status_block(
  connection: api.IConnection,
) {
  // 1. Join a new community moderator to obtain initial authorized context
  const joinBody = typia.random<ICommunityPlatformCommunityModerator.IJoin>();

  const joined: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(joined);

  const initialToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(initialToken);

  // 2. Use the issued refresh token to request new tokens
  const refreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const refreshed: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 3. Business validations on refresh behavior
  // 3-1. Same moderator id must be preserved across refresh
  TestValidator.equals(
    "moderator id is stable across token refresh",
    refreshed.id,
    joined.id,
  );

  // 3-2. Access token should be rotated
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshedToken.access,
    initialToken.access,
  );

  // 3-3. Refresh token should also be rotated
  TestValidator.notEquals(
    "refresh token is rotated on refresh",
    refreshedToken.refresh,
    initialToken.refresh,
  );

  // 3-4. Expiration timestamps should change to reflect renewed lifetime
  TestValidator.notEquals(
    "access token expiration is updated on refresh",
    refreshedToken.expired_at,
    initialToken.expired_at,
  );
  TestValidator.notEquals(
    "refresh token refreshable_until is updated on refresh",
    refreshedToken.refreshable_until,
    initialToken.refreshable_until,
  );
}
