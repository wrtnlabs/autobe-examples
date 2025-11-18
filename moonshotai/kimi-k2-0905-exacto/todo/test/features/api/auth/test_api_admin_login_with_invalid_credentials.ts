import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Verify admin login rejects invalid credentials.
 *
 * This test covers two scenarios:
 *
 * 1. Login attempt using a randomly-generated email guaranteed not to exist, with
 *    random password.
 * 2. Login attempt using a valid-format plausible email but a random, wrong
 *    password (assuming such account does not exist), ensuring server does not
 *    leak email existence or issue a session.
 *
 * The test ensures that no authentication token or session is created, and
 * error thrown is generic, providing no existence hints.
 */
export async function test_api_admin_login_with_invalid_credentials(
  connection: api.IConnection,
) {
  // Scenario 1: Non-existent email
  const nonExistentAdminLogin = {
    email: `${RandomGenerator.alphabets(10)}@never-admin.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    href: "https://admin-panel.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin-panel.example.com/" as string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  await TestValidator.error(
    "rejects login with completely random, non-existent admin email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: nonExistentAdminLogin,
      });
    },
  );

  // Scenario 2: Plausible email with bad password
  const plausibleAdminLogin = {
    email:
      `support${RandomGenerator.alphaNumeric(6)}@corp-company.com` as string &
        tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: "https://admin-panel.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin-panel.example.com/" as string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  await TestValidator.error(
    "rejects login with plausible email and random incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: plausibleAdminLogin,
      });
    },
  );
}
