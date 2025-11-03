import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_system_admin_login_existing(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Provision a fresh system admin via POST /auth/systemAdmin/join as a
   *    prerequisite
   * 2. Authenticate that admin with POST /auth/systemAdmin/login
   * 3. Validate tokens and sanitized admin summary
   * 4. Negative test: wrong password must fail without leaking existence info
   *
   * Notes:
   *
   * - DB-level verification (last_login_at, sessions table) is not possible
   *   because no direct database / Prisma client functions are provided in the
   *   available SDK. This test therefore validates side-effects visible via API
   *   responses and returned shapes only.
   */

  // 1) Prepare unique credentials
  const adminEmail = `admin.${Date.now()}@example.test`;
  const adminPassword = "Passw0rd!"; // Meets: min 8 chars, uppercase, lowercase, digit
  const displayName = RandomGenerator.name();

  // 2) Create the admin account (prerequisite)
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: displayName,
    is_super_admin: true,
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const created: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  // Validate response shape
  typia.assert(created);

  // Basic assertions about the join result
  TestValidator.predicate(
    "join returned admin id",
    typeof created.admin.id === "string" && created.admin.id.length > 0,
  );
  TestValidator.predicate(
    "join returned access token",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );

  // 3) Login with correct credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "http://localhost/admin/login",
    referrer: "http://localhost/",
  } satisfies ICommunityBbsSystemAdmin.ILogin;

  const logged: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // Validate tokens and admin summary returned by login
  TestValidator.predicate(
    "login returned access token",
    typeof logged.token.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returned refresh token",
    typeof logged.token.refresh === "string" && logged.token.refresh.length > 0,
  );

  // The admin id in login response should match the join response
  TestValidator.equals(
    "logged admin id matches created admin id",
    logged.admin.id,
    created.admin.id,
  );

  // Ensure that no sensitive field like password_hash is present on the returned admin summary
  TestValidator.predicate(
    "no sensitive password_hash leaked in admin summary",
    !("password_hash" in (logged.admin as unknown as Record<string, unknown>)),
  );

  // 4) Negative case: incorrect password must fail with an authentication error
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: {
          email: adminEmail,
          password: "WrongPass1",
          href: "http://localhost/admin/login",
          referrer: "http://localhost/",
        } satisfies ICommunityBbsSystemAdmin.ILogin,
      });
    },
  );

  // 5) MFA handling note: If MFA is enforced by the server, login would not
  // return tokens directly. This test detects that by checking token presence
  // above. If tokens were not returned, the earlier assertions would fail and
  // the test runner would surface that MFA is enabled; in that environment
  // MFA-specific flows must be covered by a separate test.
}
