import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the security validation that prevents soft-deleted administrator accounts from logging in.
 * This scenario validates that the login endpoint properly handles authentication failures
 * and maintains security boundaries for administrator access.
 */
export async function test_api_admin_login_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify initial login succeeds for active account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Verify the logged-in admin matches the created account
  TestValidator.equals("admin email matches", loginResult.email, adminEmail);
  TestValidator.equals("admin id matches", loginResult.id, joinResult.id);
  // 3. Test that invalid password is rejected
  await TestValidator.error("rejects login with wrong password", async () => {
    const invalidPasswordConnection: api.IConnection = {
      host: connection.host,
    };
    await authorize_admin_login(invalidPasswordConnection, {
      body: {
        email: adminEmail,
        password: "wrong_password",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformAdmin.ILogin,
    });
  });
  // 4. Test that non-existent email is rejected
  await TestValidator.error(
    "rejects login with non-existent email",
    async () => {
      const nonExistentConnection: api.IConnection = { host: connection.host };
      const nonExistentEmail = typia.random<string & tags.Format<"email">>();
      await authorize_admin_login(nonExistentConnection, {
        body: {
          email: nonExistentEmail,
          password: adminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IHrmPlatformAdmin.ILogin,
      });
    },
  );
  // 5. Verify token validity from successful login
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refresh deadline",
    loginResult.token.refreshable_until.length > 0,
  );
}
