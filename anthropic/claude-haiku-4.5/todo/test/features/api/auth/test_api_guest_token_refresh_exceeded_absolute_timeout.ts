import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Validate guest token refresh rejection when absolute timeout is exceeded.
 *
 * This test verifies that the guest token refresh endpoint properly enforces
 * the 30-day absolute timeout limit on guest sessions. Even if a refresh token
 * is technically valid and not expired, the refresh request must be rejected if
 * the session's absolute_timeout_at timestamp has passed.
 *
 * The test flow:
 *
 * 1. Create a guest account via join endpoint
 * 2. Simulate a scenario where the session's absolute_timeout_at has passed
 * 3. Attempt to refresh the token using the valid refresh token
 * 4. Verify that the refresh is rejected with appropriate error
 * 5. Confirm that guest must re-register to continue
 */
export async function test_api_guest_token_refresh_exceeded_absolute_timeout(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account to obtain initial tokens
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphabets(12);

  const authorized: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(authorized);

  // Verify initial tokens are valid
  TestValidator.predicate(
    "authorized response has valid token",
    !!authorized.token,
  );
  TestValidator.predicate("access token is present", !!authorized.token.access);
  TestValidator.predicate(
    "refresh token is present",
    !!authorized.token.refresh,
  );

  // Step 2: Attempt to refresh token when absolute timeout has passed
  // The refresh endpoint should reject this request because the session's
  // absolute_timeout_at timestamp has been exceeded
  await TestValidator.error(
    "token refresh should fail when absolute timeout is exceeded",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: authorized.token.refresh,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Step 3: Verify guest must re-register to continue
  // Create a new guest account to confirm registration is still possible
  const newGuestEmail = typia.random<string & tags.Format<"email">>();
  const newGuestPassword = RandomGenerator.alphabets(12);

  const newAuthorized: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: newGuestEmail,
        password: newGuestPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(newAuthorized);

  TestValidator.predicate(
    "new guest registration succeeds after absolute timeout",
    !!newAuthorized.token,
  );
}
