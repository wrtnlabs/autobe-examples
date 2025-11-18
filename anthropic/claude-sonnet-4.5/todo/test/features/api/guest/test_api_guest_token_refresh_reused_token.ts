import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test token rotation security by attempting to reuse an old refresh token.
 *
 * This test validates that the token refresh mechanism properly implements
 * token rotation security by invalidating old refresh tokens after they are
 * used. This prevents replay attacks where an attacker might try to reuse a
 * stolen refresh token.
 *
 * Workflow:
 *
 * 1. Register a guest user to obtain initial tokens
 * 2. Use the refresh token once to get a new token pair
 * 3. Attempt to use the same old refresh token again
 * 4. Verify that the second attempt fails, confirming proper token invalidation
 */
export async function test_api_guest_token_refresh_reused_token(
  connection: api.IConnection,
) {
  // Step 1: Register a guest user to obtain initial tokens
  const guestData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  const initialGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestData,
    });
  typia.assert(initialGuest);

  // Store the original refresh token before first refresh
  const oldRefreshToken: string = initialGuest.token.refresh;

  // Step 2: Use the refresh token once to get new tokens (this invalidates the old token)
  const firstRefresh: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  // Verify that first refresh succeeded and returned new tokens
  TestValidator.equals(
    "user ID should match after first refresh",
    firstRefresh.id,
    initialGuest.id,
  );

  // Step 3: Attempt to use the same old refresh token again (should fail)
  await TestValidator.error(
    "reused refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
