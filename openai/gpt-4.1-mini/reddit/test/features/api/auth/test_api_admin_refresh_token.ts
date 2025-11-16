import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";

/**
 * Test the refresh token functionality for an authenticated admin user.
 *
 * Flow:
 *
 * 1. Register a new admin user
 * 2. Authenticate admin user to get tokens
 * 3. Use refresh token to get new tokens
 * 4. Assert new tokens validity
 */
export async function test_api_admin_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd1234";
  const adminCreate: IRedditCommunityAdmin.ICreate = { email, password };
  const joinedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(joinedAdmin);

  // 2. Authenticate the admin user
  const adminLogin: IRedditCommunityAdmin.ILogin = {
    email,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  };
  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Use the refresh token endpoint
  const refreshBody: IRedditCommunityAdmin.IRefresh = {
    refresh_token: loggedInAdmin.token.refresh,
  };
  const refreshedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAdmin);

  // 4. Validate the new token values
  TestValidator.predicate(
    "token.access should be non-empty string",
    typeof refreshedAdmin.token.access === "string" &&
      refreshedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be non-empty string",
    typeof refreshedAdmin.token.refresh === "string" &&
      refreshedAdmin.token.refresh.length > 0,
  );
}
