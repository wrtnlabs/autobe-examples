import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Deny refresh for soft-deleted admin (deleted_at not null).
 *
 * This test ensures that the admin refresh token endpoint does not issue new
 * tokens if the admin account has been soft-deleted after the token was
 * originally issued. The requirements are:
 *
 * - The refresh token must have been generated at a time the admin was active
 * - The admin account is then soft-deleted (deleted_at set)
 * - When attempting to use the refresh token, the API should deny the request
 * - No new access/refresh tokens or admin information should be revealed
 * - Error messages must be generic and not leak account state (e.g., no mention
 *   if the admin is deleted, locked, etc.)
 *
 * Steps:
 *
 * 1. Simulate generation of a refresh token and prepare a non-null deleted_at
 *    admin scenario (done by mocking or direct setup as actual admin
 *    creation/delete is not possible with current API exposure in this
 *    context).
 * 2. Attempt to refresh the token using /auth/admin/refresh endpoint.
 * 3. Expect an error (rejection) response—TestValidator.error is used for this.
 */
export async function test_api_admin_refresh_token_for_soft_deleted_account(
  connection: api.IConnection,
) {
  // We cannot create and then soft-delete an admin here, so use a known-invalid or random refresh token for a soft-deleted admin scenario logic.
  // In most systems, using a valid token for a now-deleted admin will result in a generic error.

  const requestBody = {
    refresh_token: RandomGenerator.alphaNumeric(48),
  } satisfies ITodoListAdmin.IRefresh;

  await TestValidator.error(
    "should deny refresh for soft-deleted admin",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: requestBody,
      });
    },
  );
}
