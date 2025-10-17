import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Reject invalid system admin refresh token without leaking details.
 *
 * Business purpose:
 *
 * - Ensure that the system admin refresh endpoint denies malformed/invalid
 *   refresh tokens and does not establish authorization or issue tokens.
 *
 * Steps:
 *
 * 1. Create an isolated unauthenticated connection copy (headers: {}).
 * 2. Prepare a realistic but invalid JWT-like refresh token string.
 * 3. Call refresh with the invalid token and assert that it throws.
 * 4. In simulate mode, skip because the SDK mock returns random success.
 */
export async function test_api_system_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1) Isolate connection (unauthenticated). Do not touch headers after creation.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Skip this negative test in simulate mode (mock always succeeds)
  if (unauthConn.simulate === true) {
    await TestValidator.predicate(
      "skip invalid refresh token test in simulate mode",
      true,
    );
    return;
  }

  // 2) Prepare a realistic but invalid JWT-like refresh token
  const invalidToken: string = `invalid.${RandomGenerator.alphaNumeric(24)}.${RandomGenerator.alphaNumeric(24)}`;
  const invalidBody = {
    refresh_token: invalidToken,
  } satisfies ITodoListSystemAdmin.IRefresh;

  // 3) Assert that calling refresh with invalid token fails
  await TestValidator.error(
    "system admin refresh rejects invalid or malformed token",
    async () => {
      await api.functional.auth.systemAdmin.refresh(unauthConn, {
        body: invalidBody,
      });
    },
  );
}
