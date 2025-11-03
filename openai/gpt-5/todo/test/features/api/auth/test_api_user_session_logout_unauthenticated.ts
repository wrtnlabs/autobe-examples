import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

export async function test_api_user_session_logout_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * Validate that logout requires authentication and is rejected for anonymous
   * callers.
   *
   * Steps:
   *
   * 1. Create an unauthenticated connection (empty headers) without touching the
   *    original connection.
   * 2. Call POST /auth/user/logout and expect an error.
   * 3. Repeat the unauthenticated call to ensure it still fails (no state change
   *    for anonymous).
   * 4. Special case: when SDK is in simulate mode, just perform the call once and
   *    return, as auth is bypassed.
   */

  // 4) Simulation guard: SDK mock does not enforce auth; just ensure the call executes
  if (connection.simulate === true) {
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await api.functional.auth.user.logout(unauthConn);
    await TestValidator.predicate(
      "simulate mode: logout executed without auth enforcement",
      true,
    );
    return;
  }

  // 1) Prepare unauthenticated connection (do not modify the given connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Expect authentication-required error
  await TestValidator.error(
    "logout requires authentication - unauthenticated call must fail",
    async () => {
      await api.functional.auth.user.logout(unauthConn);
    },
  );

  // 3) Repeat to confirm no session state is affected for anonymous callers
  await TestValidator.error(
    "repeated unauthenticated logout still fails (no anonymous session state)",
    async () => {
      await api.functional.auth.user.logout(unauthConn);
    },
  );
}
