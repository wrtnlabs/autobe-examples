import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate 401 Unauthorized on unauthenticated admin MFA setup.
 *
 * Purpose:
 *
 * - Ensure POST /auth/admin/mfa/setup enforces authentication boundary.
 * - When called without Authorization, it must reject with 401 and not leak
 *   provisioning details.
 *
 * Steps:
 *
 * 1. Prepare a valid request body (method: "totp").
 * 2. Create an unauthenticated connection (headers: {}). Do not touch headers
 *    after creation.
 * 3. Call the endpoint with the unauthenticated connection.
 * 4. Assert an HTTP 401 Unauthorized error using TestValidator.httpError.
 */
export async function test_api_admin_mfa_setup_unauthenticated_401(
  connection: api.IConnection,
) {
  // 1) Valid request body for MFA enrollment (TOTP)
  const body = {
    method: "totp",
  } satisfies IEconDiscussAdmin.IMfaSetupRequest;

  // 2) Construct an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3~4) Expect 401 Unauthorized when unauthenticated
  await TestValidator.httpError(
    "admin MFA setup should return 401 when unauthenticated",
    401,
    async () => {
      await api.functional.auth.admin.mfa.setup.startMfaEnrollment(unauthConn, {
        body,
      });
    },
  );
}
