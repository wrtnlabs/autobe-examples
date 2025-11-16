import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

export async function test_api_admin_user_login_with_incorrect_password_lockout_flow(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser with known credentials via join
  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joinedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joinedAdmin);

  // 2. Perform several failed login attempts with wrong password
  const wrongPassword = `${joinRequestBody.password}-wrong`;

  const badLoginBody = {
    identifier: joinRequestBody.username,
    password: wrongPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const failedAttempts = 3;

  for (let i = 0; i < failedAttempts; i += 1) {
    await TestValidator.error(
      `adminUser bad login attempt #${i + 1} must fail`,
      async () => {
        await api.functional.auth.adminUser.login(connection, {
          body: badLoginBody,
        });
      },
    );
  }

  // 3. Attempt login with the correct password after repeated failures
  const goodLoginBody = {
    identifier: joinRequestBody.username,
    password: joinRequestBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  await TestValidator.error(
    "adminUser login with correct password after repeated failures must still be rejected (lockout)",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: goodLoginBody,
      });
    },
  );
}
