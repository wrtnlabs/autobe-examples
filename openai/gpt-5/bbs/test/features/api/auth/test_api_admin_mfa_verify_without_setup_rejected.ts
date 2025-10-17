import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Ensure MFA verification is rejected when setup has not been performed.
 *
 * Steps:
 *
 * 1. Register a new admin (join) to get an authenticated context.
 *
 *    - Assert the authorization response.
 *    - If subject projection is present, confirm mfaEnabled === false.
 * 2. Authorization boundary: attempt MFA verify without authentication and expect
 *    an error (no status code assertion).
 * 3. Attempt MFA verify immediately after join (no setup/secret yet) and expect an
 *    error due to missing setup.
 *
 * Notes:
 *
 * - We never assert HTTP status codes; only that an error occurs.
 * - We do not use `satisfies any` for IMfaVerifyRequest; pass a plausible object
 *   directly.
 */
export async function test_api_admin_mfa_verify_without_setup_rejected(
  connection: api.IConnection,
) {
  // 1) Register admin and assert auth response
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorized);

  // Validate initial MFA state when subject projection is present
  if (authorized.admin !== undefined) {
    TestValidator.equals(
      "admin subject starts with MFA disabled",
      authorized.admin.mfaEnabled,
      false,
    );
  }

  // 2) Authorization boundary: unauthenticated attempt must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated MFA verify should fail",
    async () => {
      await api.functional.auth.admin.mfa.verify.verifyMfa(unauthConn, {
        body: { code: "123456" },
      });
    },
  );

  // 3) Authenticated but without setup: verification must be rejected
  await TestValidator.error(
    "MFA verify without prior setup must be rejected",
    async () => {
      await api.functional.auth.admin.mfa.verify.verifyMfa(connection, {
        body: { code: "123456" },
      });
    },
  );
}
