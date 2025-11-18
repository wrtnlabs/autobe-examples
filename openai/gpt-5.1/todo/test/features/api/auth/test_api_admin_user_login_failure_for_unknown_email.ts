import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify that admin login fails for an unknown email address without creating
 * any authorized session.
 *
 * Business context:
 *
 * - The `/auth/adminUser/login` endpoint authenticates administrative users
 *   against `todo_app_adminusers` and creates a session row in
 *   `todo_app_adminuser_sessions` on success, returning
 *   `ITodoAppAdminUser.IAuthorized` including JWT tokens.
 * - For security reasons, when the supplied email does not correspond to any
 *   admin account (or when credentials are otherwise invalid), the endpoint
 *   must respond with a generic authentication failure without leaking whether
 *   the email itself exists.
 *
 * What this test validates:
 *
 * 1. A login attempt using a clearly synthetic, non-existent admin email fails and
 *    throws an error instead of returning `ITodoAppAdminUser.IAuthorized`.
 * 2. The failure is stable and repeatable across multiple attempts with the same
 *    unknown email, approximating behavior under rate limiting/logging
 *    strategies without coupling to their internal implementation.
 * 3. No successful authorization payload is ever observed on this path; if the API
 *    were to start returning a token for an unknown email, the test fails
 *    immediately.
 */
export async function test_api_admin_user_login_failure_for_unknown_email(
  connection: api.IConnection,
) {
  // Prepare a clearly synthetic, random admin email that should not exist.
  const randomLocalPart: string = RandomGenerator.alphaNumeric(16);
  const unknownEmail: string & tags.Format<"email"> =
    `${randomLocalPart}@example.invalid` as string & tags.Format<"email">;

  // Prepare common href/referrer values as valid URIs.
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Use a random password that satisfies the password format constraints.
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // Perform multiple failed login attempts to ensure consistent failure
  // semantics for an unknown email.
  const attempts: number = 3;

  for (let i = 0; i < attempts; ++i) {
    await TestValidator.error(
      `unknown admin email must not authenticate (attempt ${i + 1})`,
      async () => {
        const body = {
          email: unknownEmail,
          password,
          ip: null,
          href,
          referrer,
        } satisfies ITodoAppAdminUser.ILogin;

        // If this call succeeds and returns an authorized payload, that is a
        // security bug; explicitly fail the test by throwing an error so that
        // TestValidator.error detects the absence of an HttpError.
        const authorized: ITodoAppAdminUser.IAuthorized =
          await api.functional.auth.adminUser.login(connection, {
            body,
          });
        typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

        throw new Error(
          "Unknown admin email must not return ITodoAppAdminUser.IAuthorized",
        );
      },
    );
  }
}
