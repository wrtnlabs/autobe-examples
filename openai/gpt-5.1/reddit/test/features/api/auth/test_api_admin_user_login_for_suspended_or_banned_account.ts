import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

export async function test_api_admin_user_login_for_suspended_or_banned_account(
  connection: api.IConnection,
) {
  // 1. Join a new adminUser with random but valid credentials
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const joinedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joinedAdmin);

  // 2. Successful login with correct credentials (using username as identifier)
  const successLoginBody: ICommunityPlatformAdminUserLogin.IRequest = {
    identifier: joinBody.username,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const successLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: successLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(successLogin);

  // Validate that identity information matches between join and login responses
  TestValidator.equals(
    "username should match between join and login",
    successLogin.username,
    joinedAdmin.username,
  );
  TestValidator.equals(
    "email should match between join and login",
    successLogin.email,
    joinedAdmin.email,
  );

  // 3. Failed login attempt with wrong password (using email as identifier)
  const wrongPassword = joinBody.password + "_wrong";

  const failedLoginBody: ICommunityPlatformAdminUserLogin.IRequest = {
    identifier: joinBody.email,
    password: wrongPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  await TestValidator.error("login with wrong password must fail", async () => {
    await api.functional.auth.adminUser.login(connection, {
      body: failedLoginBody,
    });
  });
}
