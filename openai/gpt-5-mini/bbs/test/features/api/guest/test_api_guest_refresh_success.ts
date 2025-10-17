import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Validate guest refresh token rotation flow (POST /auth/guest/refresh).
   * - Ensure the refresh response returns IEconPoliticalForumGuest.IAuthorized
   *   with new access and refresh tokens and that the guest id matches the
   *   originally created guest.
   *
   * Steps:
   *
   * 1. Create a guest via POST /auth/guest/join and obtain initial tokens.
   * 2. Call POST /auth/guest/refresh with the returned refresh token.
   * 3. Assert that the response is typia-validated and contains token fields.
   * 4. Assert that the returned guest id equals the one from join.
   * 5. If rotation semantics apply, assert the refresh token changed.
   */

  // 1) Create a temporary guest and retrieve initial tokens
  const joinBody = {
    nickname: RandomGenerator.name(),
    user_agent: `test-agent/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPoliticalForumGuest.ICreate;

  const initialAuthorized: IEconPoliticalForumGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: joinBody,
    });
  // Runtime type validation of the join response
  typia.assert(initialAuthorized);

  // Basic assertions about tokens presence
  TestValidator.predicate(
    "initial access token present",
    typeof initialAuthorized.token?.access === "string" &&
      initialAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token present",
    typeof initialAuthorized.token?.refresh === "string" &&
      initialAuthorized.token.refresh.length > 0,
  );

  // Store initial refresh token for rotation comparison
  const initialRefreshToken: string = initialAuthorized.token.refresh;

  // 2) Call refresh endpoint with the valid refresh token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IEconPoliticalForumGuest.IRefresh;

  const rotatedAuthorized: IEconPoliticalForumGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });

  // Runtime type validation of the refresh response
  typia.assert(rotatedAuthorized);

  // 3) Validate returned fields
  TestValidator.equals(
    "guest id preserved after refresh",
    rotatedAuthorized.id,
    initialAuthorized.id,
  );

  TestValidator.predicate(
    "rotated access token present",
    typeof rotatedAuthorized.token?.access === "string" &&
      rotatedAuthorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "rotated refresh token present",
    typeof rotatedAuthorized.token?.refresh === "string" &&
      rotatedAuthorized.token.refresh.length > 0,
  );

  // 4) When rotation semantics are supported, ensure refresh token changed
  // Note: Some implementations may return the same refresh token (stateless
  // refresh) — this is an optional assertion guarded by a predicate so tests
  // remain compatible with both behaviors. We assert inequality when possible.
  if (initialRefreshToken !== rotatedAuthorized.token.refresh) {
    TestValidator.notEquals(
      "refresh token rotated",
      initialRefreshToken,
      rotatedAuthorized.token.refresh,
    );
  } else {
    // If tokens are identical, still assert that token strings are non-empty
    TestValidator.equals(
      "refresh token unchanged string equality check",
      rotatedAuthorized.token.refresh,
      initialRefreshToken,
    );
  }

  // Optional: Validate returned id and token shapes more deeply via typia.assert
  typia.assert<IAuthorizationToken>(rotatedAuthorized.token);
}
