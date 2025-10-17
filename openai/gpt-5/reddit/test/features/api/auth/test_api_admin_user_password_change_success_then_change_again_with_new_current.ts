import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordChange";

/**
 * Validate admin password change, then change again using the newly set
 * credential.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/adminUser/join. The SDK sets
 *    Authorization automatically.
 * 2. Call PUT /auth/adminUser/password with valid current_password/new_password
 *    and expect success.
 * 3. Immediately call PUT /auth/adminUser/password again using the previous
 *    new_password as current_password; expect success.
 * 4. Attempt an unauthenticated call to confirm the endpoint is protected; expect
 *    an error.
 * 5. Attempt with an incorrect current_password on the authenticated session;
 *    expect an error.
 *
 * Notes:
 *
 * - Only the provided APIs are used; no direct verification of password_hash or
 *   role tables is possible.
 * - Type validations rely on typia.assert; no manual status-code checks are
 *   performed.
 */
export async function test_api_admin_user_password_change_success_then_change_again_with_new_current(
  connection: api.IConnection,
) {
  // helper to generate a strong password: >= 8 chars, must include letters and digits
  const generatePassword = (length: number = 12): string => {
    const head = `A1`; // guarantees at least one letter and one digit
    const tail = RandomGenerator.alphaNumeric(
      Math.max(0, length - head.length),
    );
    return head + tail;
  };

  // 1) Register a new admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // ^[A-Za-z0-9_]{3,20}$ satisfied
  const initialPassword: string = generatePassword(12);
  const joinBody = {
    email,
    username,
    password: initialPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;
  const authorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminUser.IAuthorized>(authorized);
  if (authorized.role !== undefined) {
    TestValidator.equals(
      "authorized role is adminUser when present",
      authorized.role,
      "adminUser",
    );
  }

  // 2) First password change: initial -> pw1
  const pw1: string = generatePassword(14);
  const firstChange =
    await api.functional.auth.adminUser.password.changePassword(connection, {
      body: {
        current_password: initialPassword,
        new_password: pw1,
      } satisfies ICommunityPlatformAdminUserPasswordChange.IUpdate,
    });
  typia.assert<ICommunityPlatformAdminUserPasswordChange.ISummary>(firstChange);

  // 3) Second password change: pw1 -> pw2
  const pw2: string = generatePassword(16);
  const secondChange =
    await api.functional.auth.adminUser.password.changePassword(connection, {
      body: {
        current_password: pw1,
        new_password: pw2,
      } satisfies ICommunityPlatformAdminUserPasswordChange.IUpdate,
    });
  typia.assert<ICommunityPlatformAdminUserPasswordChange.ISummary>(
    secondChange,
  );

  // 4) Unauthenticated attempt must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const pw3: string = generatePassword(18);
  await TestValidator.error(
    "unauthenticated password change should be rejected",
    async () => {
      await api.functional.auth.adminUser.password.changePassword(unauthConn, {
        body: {
          current_password: pw2,
          new_password: pw3,
        } satisfies ICommunityPlatformAdminUserPasswordChange.IUpdate,
      });
    },
  );

  // 5) Wrong current_password must fail on authenticated connection
  // Use the original initial password (now outdated) to ensure mismatch
  const wrongAttemptNew = generatePassword(20);
  await TestValidator.error(
    "wrong current_password should be rejected",
    async () => {
      await api.functional.auth.adminUser.password.changePassword(connection, {
        body: {
          current_password: initialPassword, // outdated after two successful rotations
          new_password: wrongAttemptNew,
        } satisfies ICommunityPlatformAdminUserPasswordChange.IUpdate,
      });
    },
  );
}
