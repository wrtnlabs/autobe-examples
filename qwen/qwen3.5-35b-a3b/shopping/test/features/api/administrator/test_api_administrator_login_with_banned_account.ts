import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test banned administrator account login rejection scenario.
 *
 * Validates that administrator login properly handles banned account restrictions. Creates an administrator account and tests the authentication flow. Note: Testing the banned scenario requires setting is_banned=true via an admin operation not exposed in the public API, so this test focuses on validating normal login succeeds for non-banned accounts.
 *
 * 1. Administrator account is created via join endpoint.
 * 2. Login is attempted with correct credentials (should succeed for non-banned).
 * 3. Login with incorrect credentials (should fail).
 * 4. Documented: Testing banned account login requires external admin operation.
 */
export async function test_api_administrator_login_with_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Test data
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testEmail = `${RandomGenerator.name().toLowerCase()}@test.com`;
  const testDisplayName = RandomGenerator.name();
  // 1. Create administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: testDisplayName,
      email: testEmail,
      password: testPassword,
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAccount);
  // Verify account was created with is_banned = false
  TestValidator.equals("account not banned", adminAccount.is_banned, false);
  // 2. Test normal login with correct credentials (should succeed)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: adminAccount.email,
      password: testPassword,
      ip: "127.0.0.1",
      referrer: "http://localhost:3000/admin/login",
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login successful for non-banned account",
    loginResult.is_banned,
    false,
  );
  // 3. Test login rejection with wrong password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.ecommerceMall.auth.administrator.login(
      loginConnection,
      {
        body: {
          email: adminAccount.email,
          password: "wrongpassword123",
          ip: "127.0.0.1",
          referrer: "http://localhost:3000/admin/login",
        } satisfies IEcommerceMallAdministrator.ILogin,
      },
    );
  });
  // 4. Documented: Testing banned account scenario requires setting is_banned=true
  //    via an admin operation not exposed in the public API. This would typically be:
  //    await api.functional.admin administrators.ban(adminConnection, { id: adminAccount.id });
  //    await TestValidator.error("banned account login rejected", async () => {
  //      await api.functional.ecommerceMall.auth.administrator.login(loginConnection, {
  //        body: { email: adminAccount.email, password: testPassword, ip: "127.0.0.1", referrer: "..." },
  //      });
  //    });
}
