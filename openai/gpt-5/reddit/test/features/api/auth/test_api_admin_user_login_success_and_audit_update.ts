import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";

/**
 * Admin login via email and username with token rotation validation.
 *
 * Business flow (success path only):
 *
 * 1. Join a fresh admin user with unique email/username and required consents.
 * 2. Login using email + password → expect authorized payload and stable user id.
 * 3. Login using username + password → expect authorized payload and same user id.
 * 4. Repeat login (email) to ensure fresh token issuance and stable identity.
 *
 * Notes:
 *
 * - Audit fields like last_login_at/updated_at are not exposed by provided DTOs,
 *   so the scenario validates observable semantics: identity consistency and
 *   token rotation on repeated success.
 */
export async function test_api_admin_user_login_success_and_audit_update(
  connection: api.IConnection,
) {
  // 1) Join a fresh admin user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(10); // ^[A-Za-z0-9_]{3,20}$
  const password: string = `a1${RandomGenerator.alphaNumeric(10)}`; // ensure letter+digit

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const joined = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2) Login using email + password
  const emailLoginBody = {
    email,
    password,
  } satisfies ICommunityPlatformAdminUserLogin.IByEmail;

  const byEmail = await api.functional.auth.adminUser.login(connection, {
    body: emailLoginBody,
  });
  typia.assert(byEmail);
  TestValidator.equals(
    "email login returns same admin id as join",
    byEmail.id,
    joined.id,
  );

  // 3) Login using username + password
  const usernameLoginBody = {
    username,
    password,
  } satisfies ICommunityPlatformAdminUserLogin.IByUsername;

  const byUsername = await api.functional.auth.adminUser.login(connection, {
    body: usernameLoginBody,
  });
  typia.assert(byUsername);
  TestValidator.equals(
    "username login returns same admin id as join",
    byUsername.id,
    joined.id,
  );

  // 4) Repeat login (email) to validate token rotation and id stability
  const again = await api.functional.auth.adminUser.login(connection, {
    body: emailLoginBody,
  });
  typia.assert(again);
  TestValidator.equals("re-login maintains same admin id", again.id, joined.id);
  TestValidator.notEquals(
    "re-login issues a new access token",
    again.token.access,
    byEmail.token.access,
  );
  TestValidator.notEquals(
    "re-login issues a new refresh token",
    again.token.refresh,
    byEmail.token.refresh,
  );
}
