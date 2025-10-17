import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

/**
 * Change password for an authenticated verified expert and verify effects
 * without re-login.
 *
 * Steps
 *
 * 1. Join as a verified expert and capture plaintext password used at join.
 * 2. Change password with correct current_password (expect success).
 * 3. Attempt another change using the original (now stale) password (expect
 *    error).
 * 4. Change password again using the latest password as current_password (expect
 *    success).
 *
 * Notes
 *
 * - Typia.assert on authorization payload validates ISO 8601 timestamps and token
 *   schema.
 * - UpdatePassword returns void to avoid leaking secrets.
 * - No status code assertions; only verify that an error is thrown where
 *   appropriate.
 */
export async function test_api_verified_expert_password_change_success(
  connection: api.IConnection,
) {
  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "role must be verifiedExpert",
    authorized.role,
    "verifiedExpert",
  );
  // token shape and timestamps already validated by typia.assert on authorized
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2) First password change using correct current password
  const newPassword1 = RandomGenerator.alphaNumeric(12);
  const updateBody1 = {
    current_password: joinBody.password,
    new_password: newPassword1,
  } satisfies IEconDiscussVerifiedExpertPassword.IUpdate;
  await api.functional.auth.verifiedExpert.password.updatePassword(connection, {
    body: updateBody1,
  });

  // 3) Negative case: try stale current password (original join password)
  const newPassword2 = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "stale current_password must be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.password.updatePassword(
        connection,
        {
          body: {
            current_password: joinBody.password,
            new_password: newPassword2,
          } satisfies IEconDiscussVerifiedExpertPassword.IUpdate,
        },
      );
    },
  );

  // 4) Change password again using the latest password as current_password
  const newPassword3 = RandomGenerator.alphaNumeric(12);
  const updateBody3 = {
    current_password: newPassword1,
    new_password: newPassword3,
  } satisfies IEconDiscussVerifiedExpertPassword.IUpdate;
  await api.functional.auth.verifiedExpert.password.updatePassword(connection, {
    body: updateBody3,
  });
}
