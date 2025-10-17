import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate refresh token rotation for administrator accounts.
   *
   * Steps:
   *
   * 1. Create admin via POST /auth/administrator/join
   * 2. Exchange refresh token via POST /auth/administrator/refresh
   * 3. Assert returned token container and that tokens were rotated
   * 4. Verify access token payload references the administrator id
   * 5. Verify malformed refresh token is rejected
   *
   * Notes:
   *
   * - DB-level assertions (session row updates, audit log entries) are not
   *   performed because no SDK endpoints are available to query the DB. To
   *   enable those checks, provide SDK functions that expose sessions/audit
   *   endpoints or allow test DB access.
   */

  // 1) Create a new administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminUsername: string = RandomGenerator.alphaNumeric(8);

  const created: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(created);

  // Capture original tokens for comparison
  const originalAccess: string = created.token.access;
  const originalRefresh: string = created.token.refresh;

  // 2) Exchange refresh token
  const refreshed: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: originalRefresh,
      } satisfies IEconPoliticalForumAdministrator.IRefresh,
    });
  typia.assert(refreshed);

  // 3) Business assertions: id preserved, tokens rotated
  TestValidator.equals(
    "administrator id preserved after refresh",
    refreshed.id,
    created.id,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    originalRefresh,
    refreshed.token.refresh,
  );
  TestValidator.notEquals(
    "access token should be new",
    originalAccess,
    refreshed.token.access,
  );

  // 4) Inspect access token payload for administrator identity
  TestValidator.predicate(
    "access token payload contains admin id",
    (() => {
      try {
        const parts = refreshed.token.access.split(".");
        if (parts.length < 2) return false;
        const payload = parts[1];
        const json = Buffer.from(payload, "base64").toString("utf8");
        return json.includes(created.id);
      } catch {
        return false;
      }
    })(),
  );

  // 5) Error case: malformed (empty) refresh token should fail
  await TestValidator.error("malformed refresh token should fail", async () => {
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IEconPoliticalForumAdministrator.IRefresh,
    });
  });

  // Teardown note: No SDK functions available to revoke or delete the
  // created administrator or session. Ensure test environment uses a
  // disposable database or supports automated cleanup between test runs.
}
