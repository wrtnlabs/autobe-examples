import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin with known credentials.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const correctPassword: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password: correctPassword,
    // realistic client context
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(joined);

  // 2. Attempt to login with same email but incorrect password.
  const wrongPassword: string = `${correctPassword}-wrong`;

  const invalidLoginBody = {
    email,
    password: wrongPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  await TestValidator.error(
    "platform admin login must fail with wrong password",
    async () => {
      await api.functional.auth.platformAdmin.login(connection, {
        body: invalidLoginBody,
      });
    },
  );

  // 3. Ensure that a subsequent valid login still succeeds with the correct password.
  const validLoginBody = {
    email,
    password: correctPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: validLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(loggedIn);

  // 4. Basic business-level validation that the account remains active.
  TestValidator.predicate(
    "platform admin account remains active after failed login",
    loggedIn.isActive === true,
  );

  // 5. Validate that login did not change the admin id and email.
  TestValidator.equals(
    "platform admin id must remain stable across sessions",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "platform admin email must remain stable across sessions",
    loggedIn.email,
    joined.email,
  );
}
