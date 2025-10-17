import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";

/**
 * Validate moderator refresh-token flow and rejection of invalid tokens.
 *
 * Steps
 *
 * 1. Register a moderator using /auth/moderator/join to obtain an initial token
 *    pair.
 * 2. Refresh the session using /auth/moderator/refresh with the valid refresh
 *    token.
 *
 *    - Assert response schema, same identity (id), and access token rotation.
 * 3. Attempt refresh with an invalid refresh token and assert that an error occurs
 *    (do not check specific HTTP status codes).
 *
 * Notes
 *
 * - Request bodies strictly use the DTO variants: IEconDiscussModerator.ICreate
 *   for join, IEconDiscussModerator.IRefresh for refresh.
 * - The SDK manages Authorization headers automatically; test code must not touch
 *   headers.
 */
export async function test_api_moderator_refresh_token_rotation_and_invalid_token_rejected(
  connection: api.IConnection,
) {
  // 1) Register a moderator to obtain initial tokens
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars to satisfy policy
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussModerator.ICreate;

  const joined = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(joined);

  const oldAccess: string = joined.token.access;
  const oldRefresh: string = joined.token.refresh;

  // 2) Refresh using a valid refresh token
  const refreshBodyValid = {
    refresh_token: oldRefresh,
  } satisfies IEconDiscussModerator.IRefresh;

  const refreshed = await api.functional.auth.moderator.refresh(connection, {
    body: refreshBodyValid,
  });
  typia.assert(refreshed);

  // Identity remains the same after refresh
  TestValidator.equals(
    "identity should remain identical after refresh",
    refreshed.id,
    joined.id,
  );

  // Access token must rotate
  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    oldAccess,
  );

  // 3) Invalid token attempt should be rejected (generic error check)
  const refreshBodyInvalid = {
    refresh_token: `invalid.${RandomGenerator.alphaNumeric(16)}.token`,
  } satisfies IEconDiscussModerator.IRefresh;

  await TestValidator.error(
    "invalid refresh token must be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshBodyInvalid,
      });
    },
  );
}
