import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate that an authenticated administrator can change their password
 * successfully.
 *
 * Business flow
 *
 * 1. Register a new admin via POST /auth/admin/join (do not use login). The SDK
 *    sets Authorization automatically.
 * 2. PUT /auth/admin/password with valid current_password and strong new_password.
 * 3. Expect success with a security event acknowledgment and an ISO occurred_at
 *    (validated by typia.assert).
 * 4. Boundary: Re-attempt change using the old current_password must now fail
 *    (rotation took effect).
 * 5. Negative: Calling the endpoint without Authorization must be rejected.
 *
 * Constraints and guardrails
 *
 * - Use exact DTO variants: IEconDiscussAdmin.ICreate for join,
 *   IEconDiscussAdmin.IChangePassword for password change.
 * - Use satisfies for request bodies; never use type assertions.
 * - Do not touch connection.headers except creating an unauthenticated clone for
 *   boundary testing.
 * - Do not assert specific HTTP status codes or error messages; only that an
 *   error occurs where expected.
 */
export async function test_api_admin_password_change_success(
  connection: api.IConnection,
) {
  // 1) Register a new admin and obtain authenticated context (SDK sets Authorization)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const oldPassword: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name(2);

  const joinBody = {
    email,
    password: oldPassword,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Change password with valid current_password → success
  const newPassword1: string = RandomGenerator.alphaNumeric(12);
  const changeOk = await api.functional.auth.admin.password.changePassword(
    connection,
    {
      body: {
        current_password: oldPassword,
        new_password: newPassword1,
      } satisfies IEconDiscussAdmin.IChangePassword,
    },
  );
  typia.assert(changeOk);

  // Business-level signal: outcome should be a non-empty string
  TestValidator.predicate(
    "password change outcome is present",
    changeOk.outcome.trim().length > 0,
  );

  // 4) Boundary: using old current_password again must fail (rotation enforced)
  await TestValidator.error(
    "using old current_password after rotation should fail",
    async () => {
      await api.functional.auth.admin.password.changePassword(connection, {
        body: {
          current_password: oldPassword, // stale password after rotation
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconDiscussAdmin.IChangePassword,
      });
    },
  );

  // 5) Negative: unauthenticated call must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized changePassword call must be rejected",
    async () => {
      await api.functional.auth.admin.password.changePassword(unauthConn, {
        body: {
          current_password: oldPassword,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconDiscussAdmin.IChangePassword,
      });
    },
  );
}
