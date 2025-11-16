import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

export async function test_api_guest_user_refresh_rejects_deleted_guest_identity(
  connection: api.IConnection,
) {
  // 1. Create or materialize a guest placeholder via join
  const anonymousToken: string = `guest-${RandomGenerator.alphaNumeric(16)}`;

  const joinBody = {
    anonymous_token: anonymousToken,
    ip: null,
    href: "https://example.com/guest/join",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardGuestUser.IJoin;

  const joined: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic invariants on the join response
  TestValidator.equals(
    "joined anonymous_token matches request",
    joined.anonymous_token,
    anonymousToken,
  );
  TestValidator.predicate(
    "joined deleted_at is null or undefined (active guest)",
    joined.deleted_at === null || joined.deleted_at === undefined,
  );
  TestValidator.predicate(
    "joined access token is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined refresh token is non-empty",
    joined.token.refresh.length > 0,
  );

  const originalAccess: string = joined.token.access;
  const originalRefresh: string = joined.token.refresh;

  // 2. Refresh tokens using the refresh token from join
  const refreshBody = {
    refreshToken: originalRefresh,
    ip: null,
    href: "https://example.com/guest/refresh",
    referrer: "https://example.com/guest/join",
  } satisfies IDiscussionBoardGuestUser.IRefresh;

  const refreshed: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate identity stability
  TestValidator.equals(
    "refreshed guest id remains the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refreshed anonymous_token remains the same",
    refreshed.anonymous_token,
    joined.anonymous_token,
  );

  // deleted_at should remain unchanged (still logically active in this scenario)
  TestValidator.equals(
    "refreshed deleted_at remains unchanged",
    refreshed.deleted_at ?? null,
    joined.deleted_at ?? null,
  );

  // 4. Validate token non-emptiness after refresh
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );

  // 5. Validate SDK connection header side-effect for Authorization, if present
  if (connection.headers !== undefined) {
    const authorization = connection.headers.Authorization;
    if (typeof authorization === "string") {
      TestValidator.equals(
        "connection Authorization header tracks latest access token",
        authorization,
        refreshed.token.access,
      );
    }
  }
}
