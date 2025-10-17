import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_refresh_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify refresh token rotation semantics for a freshly joined registered
   *   user.
   * - Ensure the refresh endpoint returns a new access token and a rotated
   *   refresh token.
   * - Optionally assert that the previous refresh token is rejected after
   *   rotation.
   *
   * Steps:
   *
   * 1. Register a new user with POST /auth/registeredUser/join
   * 2. Call POST /auth/registeredUser/refresh with the returned refresh token
   * 3. Assert token rotation, presence of new access token, and session metadata
   *    updates
   * 4. Attempt to reuse the old refresh token and expect an error (optional,
   *    implementation dependent)
   */

  // 1) Setup: create a fresh registered user
  const username = `user_${RandomGenerator.alphaNumeric(6)}_${Date.now()}`;
  const email = `${username}@example.com`;
  const password = `Str0ngP@ss!${RandomGenerator.alphaNumeric(4)}`;

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const joined: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Validate join response shape
  typia.assert(joined);

  // Extract initial tokens
  const initialAccess: string = joined.token.access;
  const initialRefresh: string = joined.token.refresh;

  // Basic sanity checks
  TestValidator.predicate(
    "joined: access token is non-empty",
    typeof initialAccess === "string" && initialAccess.length > 0,
  );
  TestValidator.predicate(
    "joined: refresh token is non-empty",
    typeof initialRefresh === "string" && initialRefresh.length > 0,
  );

  // 2) Exercise: rotate the refresh token
  const refreshRequest = {
    refresh_token: initialRefresh,
  } satisfies IEconPoliticalForumRegisteredUser.IRefresh;

  const refreshed: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshed);

  // 3) Assertions: new tokens and rotation
  TestValidator.predicate(
    "refreshed: access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.notEquals(
    "refreshed: refresh token rotated",
    initialRefresh,
    refreshed.token.refresh,
  );

  // Server-provided timestamps (optional assertions when available)
  // joined.created_at and joined.updated_at may or may not be present. Check existence before strict comparisons.
  if (joined.updated_at !== undefined && refreshed.updated_at !== undefined) {
    TestValidator.predicate(
      "session updated_at changed on refresh",
      refreshed.updated_at !== joined.updated_at,
    );
  } else {
    // If updated_at not present on join, at least ensure refreshed.updated_at exists (server updated session metadata)
    TestValidator.predicate(
      "refreshed: updated_at present",
      refreshed.updated_at !== null && refreshed.updated_at !== undefined,
    );
  }

  // 4) Optional: the original refresh token should be rejected after rotation.
  // This behavior is security-policy dependent. Use await TestValidator.error with an async callback.
  await TestValidator.error(
    "old refresh token should be rejected after rotation",
    async () => {
      await api.functional.auth.registeredUser.refresh(connection, {
        body: {
          refresh_token: initialRefresh,
        } satisfies IEconPoliticalForumRegisteredUser.IRefresh,
      });
    },
  );

  // Teardown:
  // The provided SDK does not include revoke endpoints in the available functions.
  // Rely on test DB cleanup policies in CI or external revoke utilities.
}
