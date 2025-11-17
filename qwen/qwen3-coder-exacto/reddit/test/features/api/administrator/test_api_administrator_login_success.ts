import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";

export async function test_api_administrator_login_success(
  connection: api.IConnection,
) {
  // First, create a base user that can be promoted to administrator
  // In a real scenario, we would first create a user through user registration
  // For this test, we'll simulate having a user ID by generating a UUID
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Register the user as an administrator
  const adminCreateResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        community_forum_user_id: userId,
        role: "system_admin",
      } satisfies ICommunityForumCommunityAdministrator.ICreate,
    },
  );
  typia.assert(adminCreateResponse);

  // Test successful login with valid credentials
  const loginBody = {
    email: "admin@example.com", // Using a fixed email for consistency in testing
    password: "password123",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  const loginResponse = await api.functional.auth.administrator.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResponse);

  // Validate that we received authorization tokens
  TestValidator.predicate(
    "login response should contain valid tokens",
    () =>
      loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0 &&
      new Date(loginResponse.token.expired_at).getTime() > Date.now() &&
      new Date(loginResponse.token.refreshable_until).getTime() > Date.now(),
  );

  // Validate that we received administrator information
  TestValidator.predicate(
    "login response should contain administrator information",
    () =>
      loginResponse.id.length > 0 &&
      loginResponse.community_forum_user_id.length > 0,
  );

  // Validate the structure of the response
  TestValidator.equals(
    "administrator ID should match created administrator ID",
    loginResponse.id,
    adminCreateResponse.id,
  );

  TestValidator.equals(
    "user ID should match the base user ID",
    loginResponse.community_forum_user_id,
    userId,
  );
}
