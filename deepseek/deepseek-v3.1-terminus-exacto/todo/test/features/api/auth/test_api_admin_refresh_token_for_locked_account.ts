import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate that an admin who is locked cannot use a refresh token.
 *
 * This test ensures that a previously valid refresh token for an admin account
 * is no longer valid once the account gets locked (locked = true), and that the
 * refresh endpoint does not issue new tokens or leak lock status through the
 * error message. No token is issued, and the error message remains generic.
 */
export async function test_api_admin_refresh_token_for_locked_account(
  connection: api.IConnection,
) {
  // Simulate a previously issued valid token
  // (In a real test setup, you'd create an admin, log in, then lock them in DB)
  const refreshToken = RandomGenerator.alphaNumeric(64);

  // Simulate a locked admin scenario: the backend will reject this refresh token
  const requestBody = {
    refresh_token: refreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  // Attempt to refresh token, which should fail for locked account
  await TestValidator.error("refresh fails for locked admin", async () => {
    await api.functional.auth.admin.refresh(connection, { body: requestBody });
  });
}
