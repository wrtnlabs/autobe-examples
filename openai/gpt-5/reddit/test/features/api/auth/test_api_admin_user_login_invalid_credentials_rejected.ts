import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";

/**
 * Verify admin login rejects invalid credentials and issues tokens only on
 * success.
 *
 * Workflow
 *
 * 1. Create an admin via join with known credentials
 * 2. Try to login with correct identifier but wrong password (expect rejection)
 * 3. Try to login with unknown identifier (expect rejection)
 * 4. Login with correct credentials (expect success) and confirm identity
 *    consistency
 * 5. Repeat successful login to ensure stability
 */
export async function test_api_admin_user_login_invalid_credentials_rejected(
  connection: api.IConnection,
) {
  // 1) Provision a valid admin via join
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8); // ^[A-Za-z0-9_]{3,20}$ satisfied by lowercase letters
  const password = `${RandomGenerator.alphabets(6)}1${RandomGenerator.alphaNumeric(5)}`; // ensures letter+digit, length >= 8

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const created = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(created);

  // Use a fresh unauthenticated connection for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Attempt login with wrong password for the existing email
  const wrongLoginBody = {
    email,
    password: "wrongPASS123", // valid length & chars but incorrect
  } satisfies ICommunityPlatformAdminUserLogin.IByEmail;

  await TestValidator.error(
    "admin login with correct email but wrong password must be rejected",
    async () => {
      await api.functional.auth.adminUser.login(unauthConn, {
        body: wrongLoginBody,
      });
    },
  );

  // 3) Attempt login with unknown email
  const unknownLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
  } satisfies ICommunityPlatformAdminUserLogin.IByEmail;

  await TestValidator.error(
    "admin login with unknown email must be rejected",
    async () => {
      await api.functional.auth.adminUser.login(unauthConn, {
        body: unknownLoginBody,
      });
    },
  );

  // 4) Successful login with correct credentials
  const successLoginBody = {
    email,
    password,
  } satisfies ICommunityPlatformAdminUserLogin.IByEmail;

  const authorized = await api.functional.auth.adminUser.login(unauthConn, {
    body: successLoginBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "successful login returns the same admin user id as join",
    authorized.id,
    created.id,
  );

  // 5) Stability: repeat successful login and ensure identity is consistent
  const authorizedAgain = await api.functional.auth.adminUser.login(
    unauthConn,
    {
      body: successLoginBody,
    },
  );
  typia.assert(authorizedAgain);
  TestValidator.equals(
    "repeated successful login yields the same admin user id",
    authorizedAgain.id,
    created.id,
  );
}
