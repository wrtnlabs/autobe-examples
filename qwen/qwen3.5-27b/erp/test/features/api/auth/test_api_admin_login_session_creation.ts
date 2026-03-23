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
 * Test the session management and security auditing features during administrator login.
 * This scenario validates that when an administrator logs in, the system properly creates
 * a session record with security metadata for audit trail purposes.
 */
export async function test_api_admin_login_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(joinResult);
  // 2. Create a fresh connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Prepare login credentials with session metadata
  const loginBody = {
    email: joinResult.email,
    password: testPassword,
    href: "https://hrm-platform.example.com/admin/login",
    referrer: "https://hrm-platform.example.com/admin/dashboard",
    ip: "192.168.1.100",
  } satisfies IHrmPlatformAdmin.ILogin;
  // 4. Call the login endpoint with valid credentials
  const loginResult = await authorize_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 5. Validate login response matches joined admin
  TestValidator.equals("admin id matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "admin email matches",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "created_at matches",
    loginResult.created_at,
    joinResult.created_at,
  );
  // 6. Validate token structure is complete
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 7. Validate session metadata was accepted
  TestValidator.predicate(
    "href URL was accepted",
    loginBody.href.includes("hrm-platform.example.com"),
  );
  TestValidator.predicate(
    "referrer URL was accepted",
    loginBody.referrer.includes("hrm-platform.example.com"),
  );
  TestValidator.predicate(
    "IP address was accepted",
    loginBody.ip === "192.168.1.100",
  );
}
