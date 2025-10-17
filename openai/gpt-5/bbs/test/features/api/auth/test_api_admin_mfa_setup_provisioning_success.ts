import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate admin MFA setup provisioning (happy path) and unauthenticated
 * boundary.
 *
 * Steps
 *
 * 1. Register a new admin via /auth/admin/join to obtain an authenticated context
 * 2. Start MFA enrollment via /auth/admin/mfa/setup with method=totp
 * 3. Validate provisioning output and that MFA is not enabled yet (no verify call
 *    here)
 * 4. Verify unauthenticated boundary by calling setup with an empty-headers
 *    connection
 */
export async function test_api_admin_mfa_setup_provisioning_success(
  connection: api.IConnection,
) {
  // 1) Admin join (SDK will attach Authorization header automatically)
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10), // >= 8 characters
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(authorized);

  // If subject projection is present, MFA must not be enabled yet
  await TestValidator.predicate(
    "admin subject present implies mfaEnabled is false before verification",
    () =>
      authorized.admin === undefined || authorized.admin.mfaEnabled === false,
  );

  // 2) Start MFA enrollment (TOTP)
  const setupReq = {
    method: "totp",
  } satisfies IEconDiscussAdmin.IMfaSetupRequest;

  const setup: IEconDiscussAdmin.IMfaSetup =
    await api.functional.auth.admin.mfa.setup.startMfaEnrollment(connection, {
      body: setupReq,
    });
  typia.assert(setup);

  // 3) Business validations on provisioning output
  TestValidator.equals("MFA method should be totp", setup.method, "totp");
  await TestValidator.predicate(
    "provisioning_uri should look like an otpauth URI",
    async () => setup.provisioning_uri.toLowerCase().includes("otpauth"),
  );

  // 4) Negative: unauthenticated connection should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot start MFA enrollment",
    async () => {
      await api.functional.auth.admin.mfa.setup.startMfaEnrollment(unauthConn, {
        body: { method: "totp" } satisfies IEconDiscussAdmin.IMfaSetupRequest,
      });
    },
  );
}
