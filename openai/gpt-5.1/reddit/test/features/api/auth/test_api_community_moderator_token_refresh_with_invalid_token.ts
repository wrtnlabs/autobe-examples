import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate that the community moderator refresh endpoint rejects invalid
 * refresh tokens.
 *
 * Business goal: Ensure that POST /auth/communityModerator/refresh cannot be
 * abused with random or structurally invalid refreshToken strings, and that
 * only tokens actually issued by the platform result in new IAuthorized
 * sessions.
 *
 * High-level flow:
 *
 * 1. Register a new community moderator via join to ensure we have a legitimate
 *    account and that the auth pipeline is working.
 * 2. Execute at least one successful refresh using a valid refreshToken to
 *    demonstrate the happy path still works.
 * 3. Construct a clearly invalid refreshToken (random opaque string) that is
 *    guaranteed not to be a real issued refresh token.
 * 4. Call the refresh endpoint with this invalid token and assert that it throws,
 *    using TestValidator.error with an async callback.
 * 5. We do not assert HTTP status codes or error bodies; we only validate that the
 *    operation fails for the invalid token while succeeding for the valid one.
 */
export async function test_api_community_moderator_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Create a legitimate community moderator account via join.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // display_name and ip are optional; demonstrate both filled and null usage.
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorizedFromJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    authorizedFromJoin,
  );

  // 2. Perform a valid refresh call to confirm the endpoint works with a
  //    realistic refresh token. The SDK is responsible for managing tokens; we
  //    only exercise the API surface.
  const validRefreshBody = {
    refreshToken: authorizedFromJoin.token.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const authorizedFromValidRefresh: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    authorizedFromValidRefresh,
  );

  // Sanity check: refreshed moderator id must be the same as original.
  TestValidator.equals(
    "refreshed moderator id should equal joined moderator id",
    authorizedFromValidRefresh.id,
    authorizedFromJoin.id,
  );

  // 3. Construct an obviously invalid refresh token. It is still a string, so
  //    it respects the IRefresh DTO type, but it is guaranteed not to be an
  //    issued refresh token.
  const invalidRefreshToken: string = `invalid-${RandomGenerator.alphaNumeric(32)}`;

  const invalidRefreshBody = {
    refreshToken: invalidRefreshToken,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  // 4. Call refresh with the invalid token and assert that it throws.
  await TestValidator.error(
    "refresh with invalid token must fail",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 5. As a final sanity check, perform one more valid refresh using the
  //    latest known good refresh token so we know the endpoint is still
  //    operational for correct tokens and only rejects the invalid ones.
  const finalValidRefreshBody = {
    refreshToken: authorizedFromValidRefresh.token.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const authorizedFromFinalRefresh: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: finalValidRefreshBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    authorizedFromFinalRefresh,
  );

  TestValidator.equals(
    "final refreshed moderator id remains stable",
    authorizedFromFinalRefresh.id,
    authorizedFromJoin.id,
  );
}
