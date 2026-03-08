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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  // 2. Create admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    },
  });
  typia.assert(joinResult);
  // Verify join response structure
  TestValidator.equals("join is_active", joinResult.is_active, true);
  TestValidator.equals("join email matches", joinResult.email, adminEmail);
  TestValidator.equals(
    "join username matches",
    joinResult.username,
    adminUsername,
  );
  typia.assert(joinResult.token);
  TestValidator.predicate(
    "join access token exists",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join refresh token exists",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join expired_at exists",
    joinResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "join refreshable_until exists",
    joinResult.token.refreshable_until.length > 0,
  );
  // 3. Login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate login response structure
  TestValidator.equals("login is_active", loginResult.is_active, true);
  TestValidator.equals("login email matches", loginResult.email, adminEmail);
  TestValidator.equals(
    "login username matches",
    loginResult.username,
    adminUsername,
  );
  TestValidator.equals(
    "login display_name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "login bio matches",
    loginResult.bio ?? null,
    joinResult.bio ?? null,
  );
  // 5. Validate token structure
  typia.assert(loginResult.token);
  TestValidator.predicate(
    "login access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login expired_at exists",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login refreshable_until exists",
    loginResult.token.refreshable_until.length > 0,
  );
  // 6. Verify timestamps are ISO 8601 format
  const createdAt = new Date(loginResult.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  const updatedAt = new Date(loginResult.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  const expiredAt = new Date(loginResult.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // 7. Verify access token expires in future
  TestValidator.predicate(
    "access token expires in future",
    expiredAt.getTime() > new Date().getTime(),
  );
  // 8. Verify refreshable_until extends beyond expired_at
  TestValidator.predicate(
    "refreshable_until extends beyond expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 9. Verify avatar_url is valid URI format or null/undefined
  if (loginResult.avatar_url !== undefined && loginResult.avatar_url !== null) {
    typia.assert(loginResult.avatar_url);
  }
}
