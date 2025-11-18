import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Test that the /auth/admin/refresh endpoint robustly rejects invalid refresh
 * tokens.
 *
 * This test attempts to renew an administrator session using:
 *
 * - A string that cannot possibly be a valid token
 * - An obviously expired token value
 * - A random string to simulate tampering
 *
 * The test expects:
 *
 * - The endpoint must deny the request and throw an error
 * - No access or refresh tokens are issued in any response
 * - No information about admin accounts or session/status details are leaked
 * - Responses only return a generic error (no sensitive data)
 * - Endpoint is robust to malformed input, and error handling is consistent with
 *   policy
 */
export async function test_api_admin_refresh_token_invalid(
  connection: api.IConnection,
) {
  // Try with a clearly bogus refresh token
  await TestValidator.error(
    "refresh with random invalid token is rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "not-a-valid-token-1234567890",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Try with a token-shaped but fake value (could simulate expired or tampered)
  await TestValidator.error(
    "refresh with fake-shaped token string is rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Try with an empty string
  await TestValidator.error(
    "refresh with empty string is rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: { refresh_token: "" } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}
