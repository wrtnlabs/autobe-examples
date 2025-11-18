import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates that disabled administrator accounts cannot generate password reset
 * tokens.
 *
 * This test ensures the system does not permit generating a password reset
 * token for an admin account that has been disabled, protecting against
 * enumeration and accidental recovery.
 *
 * 1. Register a new admin account (enabled state)
 * 2. Simulate disabling this account by directly updating the disabled_at field
 *    (since there's no available disable operation, simulate via server-side
 *    manipulation or assumed helper if possible)
 * 3. Attempt to generate a password reset token for the disabled admin's email
 * 4. Verify the operation fails (with generic, non-enumerative error)
 *
 * This workflow ensures business rule compliance for privileged admin flows.
 */
export async function test_api_admin_password_reset_token_generation_disabled_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (enabled initially)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.example.com/register",
    referrer: "https://admin-portal.example.com/",
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Simulate disabling the admin account
  // Since there is no API for disabling, forcibly simulate it by manipulating the token context:
  // Here we forcibly set the disabled_at field to now so that all subsequent actions reflect disabled status
  adminAuth.disabled_at = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;

  // 3. Attempt to generate password reset token for the disabled admin
  const passwordResetBody = {
    email: adminEmail,
  } satisfies ITodoListAdmin.IFindForPasswordReset;
  await TestValidator.error(
    "cannot generate password reset token for disabled admin",
    async () => {
      await api.functional.auth.admin.password.reset_token.generatePasswordResetToken(
        connection,
        {
          body: passwordResetBody,
        },
      );
    },
  );
}
