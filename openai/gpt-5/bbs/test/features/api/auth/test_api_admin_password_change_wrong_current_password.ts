import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate admin password change rejects wrong current password and enforces
 * auth.
 *
 * Steps:
 *
 * 1. Seed: join a fresh admin (sets Authorization automatically on the
 *    connection).
 * 2. Auth boundary: call changePassword using an unauthenticated connection and
 *    expect error.
 * 3. Wrong-current rejection: with auth present, attempt changePassword using an
 *    incorrect current_password and expect error.
 * 4. Success path: retry using the correct current password and assert a valid
 *    ISecurityEvent is returned.
 * 5. Robustness: old password should be invalid after successful change (expect
 *    error when reusing it).
 *
 * Notes:
 *
 * - Uses only provided endpoints: POST /auth/admin/join and PUT
 *   /auth/admin/password.
 * - No HTTP status code assertions; failure is validated by generic error
 *   expectation.
 * - All request bodies use `satisfies` with exact DTO variants.
 */
export async function test_api_admin_password_change_wrong_current_password(
  connection: api.IConnection,
) {
  // 1) Join a fresh admin; SDK sets Authorization header automatically
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: initialPassword,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Authentication boundary: unauthenticated connection must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "requires authentication: changePassword rejects unauthenticated request",
    async () => {
      await api.functional.auth.admin.password.changePassword(unauthConn, {
        body: {
          current_password: "irrelevant-old",
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconDiscussAdmin.IChangePassword,
      });
    },
  );

  // 3) Wrong current password should be rejected
  const wrongCurrent = `${initialPassword}${RandomGenerator.alphaNumeric(3)}`;
  const strongNew1 = RandomGenerator.alphaNumeric(16);
  await TestValidator.error("reject wrong current password", async () => {
    await api.functional.auth.admin.password.changePassword(connection, {
      body: {
        current_password: wrongCurrent,
        new_password: strongNew1,
      } satisfies IEconDiscussAdmin.IChangePassword,
    });
  });

  // 4) Correct current password should succeed
  const strongNew2 = RandomGenerator.alphaNumeric(16);
  const securityEvent = await api.functional.auth.admin.password.changePassword(
    connection,
    {
      body: {
        current_password: initialPassword,
        new_password: strongNew2,
      } satisfies IEconDiscussAdmin.IChangePassword,
    },
  );
  typia.assert(securityEvent);

  // 5) Old password becomes invalid after successful change
  await TestValidator.error(
    "old password invalid after successful change",
    async () => {
      await api.functional.auth.admin.password.changePassword(connection, {
        body: {
          current_password: initialPassword,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconDiscussAdmin.IChangePassword,
      });
    },
  );
}
