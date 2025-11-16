import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_login_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Seed environment realism with a valid platform admin join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "password1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Build a clearly non-existent email (separate random email value)
  const nonexistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 3. Attempt login with the non-existent email and any password
  const nonexistentLoginBody = {
    email: nonexistentEmail,
    password: "some-wrong-password",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  await TestValidator.error(
    "platform admin login must fail for non-existent email",
    async () => {
      await api.functional.auth.platformAdmin.login(connection, {
        body: nonexistentLoginBody,
      });
    },
  );

  // 4. Verify that valid admin can still log in successfully afterwards
  const validLoginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const authorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: validLoginBody,
    });
  typia.assert(authorized);

  // Confirm that the logged-in admin email matches the joined admin email
  TestValidator.equals(
    "joined admin email should match authorized session email",
    authorized.email,
    joinBody.email,
  );
}
