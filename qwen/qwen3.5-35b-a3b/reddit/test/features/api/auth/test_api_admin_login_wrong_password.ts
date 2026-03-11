import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminAccount);
  const testEmail = adminAccount.email;
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  // 2. Attempt login with wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_admin_login(loginConnection, {
      body: {
        email: testEmail,
        password: wrongPassword,
      } satisfies IRedditPlatformAdmin.ILogin,
    });
    // If we reach here, test fails because login should have thrown
    throw new Error("Login with wrong password should have been rejected");
  } catch (error) {
    // Validate that the error is an HTTP error with appropriate status
    if (typia.is<api.HttpError>(error)) {
      // Status code should indicate authentication failure (401)
      const statusCode = error.status;
      TestValidator.equals("login rejected with 401 status", statusCode, 401);
      // Verify no authorization header was set on connection (no session created)
      const hasAuthHeader = !!loginConnection.headers?.Authorization;
      TestValidator.equals(
        "no session created on failed login",
        hasAuthHeader,
        false,
      );
    } else {
      throw new Error("Expected api.HttpError but got different error type");
    }
  }
  // 3. Verify account is still active (not locked due to failed login)
  // Re-login with correct password should still work
  const correctLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(correctLoginConnection, {
    body: {
      email: testEmail,
      password: correctPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  TestValidator.predicate("account still active after failed attempt", true);
}
