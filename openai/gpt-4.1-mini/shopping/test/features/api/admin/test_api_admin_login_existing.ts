import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // 1. Admin joins to create a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Str0ngP@ssw0rd!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const joinedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(joinedAdmin);
  TestValidator.equals(
    "joined admin email matches input",
    joinedAdmin.email,
    adminJoinBody.email,
  );
  TestValidator.predicate(
    "token.access is non-empty",
    joinedAdmin.token.access.length > 0,
  );

  // 2. Admin login with valid credentials
  const adminLoginBody = {
    email: adminEmail,
    password: "Str0ngP@ssw0rd!",
    href: "https://admin.shoppingmall.com/login",
    referrer: "https://admin.shoppingmall.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login result email matches",
    loginResult.email,
    adminLoginBody.email,
  );
  TestValidator.predicate(
    "login token access is non-empty",
    loginResult.token.access.length > 0,
  );

  // 3. Admin login with invalid password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: "WrongPassword!",
          href: "https://admin.shoppingmall.com/login",
          referrer: "https://admin.shoppingmall.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // 4. Admin login with unregistered email
  await TestValidator.error(
    "login should fail with unknown email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "Str0ngP@ssw0rd!",
          href: "https://admin.shoppingmall.com/login",
          referrer: "https://admin.shoppingmall.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
}
