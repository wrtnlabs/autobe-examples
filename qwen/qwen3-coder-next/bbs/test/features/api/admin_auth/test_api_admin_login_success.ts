import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Create admin account using utility function with fresh connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: email,
      password: password,
      display_name: "Test Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Test successful admin login with valid credentials using fresh connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate response structure and token properties
  TestValidator.equals("admin ID present", loginResult.id, adminAccount.id);
  // Verify access token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "access token has valid format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResult.token.access,
    ),
  );
  // Verify refresh token structure
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResult.token.refresh,
    ),
  );
  // Verify expiration timestamps exist
  TestValidator.predicate(
    "access token expiration exists",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration exists",
    loginResult.token.refreshable_until.length > 0,
  );
  // Verify expiration is reasonable (access: 15-60 min, refresh: 7-14 days)
  const now = new Date().getTime();
  const expiredAt = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "access token expiration reasonable",
    expiredAt - now > 15 * 60 * 1000 && expiredAt - now < 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expiration reasonable",
    refreshableUntil - now > 7 * 24 * 60 * 60 * 1000 &&
      refreshableUntil - now < 14 * 24 * 60 * 60 * 1000,
  );
}
