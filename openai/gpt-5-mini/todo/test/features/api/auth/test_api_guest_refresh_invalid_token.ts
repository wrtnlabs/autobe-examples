import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_refresh_invalid_token(
  connection: api.IConnection,
) {
  /**
   * Test scenario: Verify that POST /auth/guest/refresh rejects invalid or
   * tampered refresh tokens.
   *
   * Steps:
   *
   * 1. Create a guest via POST /auth/guest/join and obtain the issued tokens.
   * 2. Attempt refresh with an obviously malformed token string.
   * 3. Attempt refresh with a tampered refresh token derived from the valid one.
   * 4. Expect both attempts to throw (use TestValidator.error). Do NOT assert
   *    specific HTTP status codes or manipulate connection.headers.
   *
   * Notes:
   *
   * - Because no guest metadata read endpoint is available in the provided SDK,
   *   this test cannot re-query guest.last_active_at to confirm it was not
   *   updated. If such an endpoint exists in the environment, a follow-up check
   *   can be added to ensure last_active_at remains unchanged after failed
   *   attempts.
   */

  // 1) Create a guest and obtain valid tokens
  const guest: ITodoAppGuest.IAuthorized = await api.functional.auth.guest.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  // Runtime type validation of the returned payload
  typia.assert(guest);

  // Capture the valid refresh token for tampering
  const validRefreshToken: string = guest.token.refresh;

  // 2) Malformed token (clearly invalid format) → expect error
  await TestValidator.error(
    "refresh with malformed token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "not-a-valid-token",
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );

  // 3) Tampered token (valid-looking but modified) → expect error
  const tamperedToken: string = `${validRefreshToken}.tampered`;
  await TestValidator.error(
    "refresh with tampered token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );

  // 4) Note: cannot assert last_active_at because no guest retrieval API
  // is available from the given SDK. If a GET endpoint for guest metadata
  // becomes available, insert a re-query here and assert that
  // last_active_at did not change after the failed refresh attempts.
}
