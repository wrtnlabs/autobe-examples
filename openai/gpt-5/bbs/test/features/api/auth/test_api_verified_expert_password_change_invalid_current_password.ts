import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

/**
 * Rejects password change with wrong current password, then succeeds with
 * correct current password.
 *
 * Business goal:
 *
 * - Ensure the password update endpoint does not modify credentials on invalid
 *   current_password.
 * - Confirm that, after a valid request, the password actually changes and can be
 *   used as the new current password.
 *
 * Steps:
 *
 * 1. Join as a verified expert (issues token and authenticates this connection).
 * 2. Attempt to update password with an incorrect current_password → expect error.
 * 3. Update password with the correct current_password → expect success (void).
 * 4. Optional: Change again using the newly set password to a third password →
 *    expect success.
 */
export async function test_api_verified_expert_password_change_invalid_current_password(
  connection: api.IConnection,
) {
  // 1) Join as verified expert to obtain an authenticated session
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<120>
  >();
  const initialPassword = typia.random<
    string & tags.MinLength<12> & tags.MaxLength<64>
  >();

  const auth: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: {
        email,
        password: initialPassword,
        display_name: displayName,
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussVerifiedExpertJoin.ICreate,
    });
  typia.assert(auth);
  TestValidator.equals(
    "session role should be verifiedExpert",
    auth.role,
    "verifiedExpert",
  );

  // 2) Negative: wrong current password must be rejected
  const wrongPassword = typia.random<
    string & tags.MinLength<12> & tags.MaxLength<64>
  >();
  await TestValidator.error(
    "reject password update when current password is incorrect",
    async () => {
      await api.functional.auth.verifiedExpert.password.updatePassword(
        connection,
        {
          body: {
            current_password: wrongPassword,
            new_password: typia.random<
              string & tags.MinLength<12> & tags.MaxLength<64>
            >(),
          } satisfies IEconDiscussVerifiedExpertPassword.IUpdate,
        },
      );
    },
  );

  // 3) Positive: correct current password must succeed
  const newPassword = typia.random<
    string & tags.MinLength<12> & tags.MaxLength<64>
  >();
  await api.functional.auth.verifiedExpert.password.updatePassword(connection, {
    body: {
      current_password: initialPassword,
      new_password: newPassword,
    } satisfies IEconDiscussVerifiedExpertPassword.IUpdate,
  });

  // 4) Optional confirmation: newly set password should now work as current
  const newerPassword = typia.random<
    string & tags.MinLength<12> & tags.MaxLength<64>
  >();
  await api.functional.auth.verifiedExpert.password.updatePassword(connection, {
    body: {
      current_password: newPassword,
      new_password: newerPassword,
    } satisfies IEconDiscussVerifiedExpertPassword.IUpdate,
  });
}
