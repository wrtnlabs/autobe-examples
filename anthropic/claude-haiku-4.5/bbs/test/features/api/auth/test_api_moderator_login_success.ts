import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Create moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";

  const joinedModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://admin.example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(joinedModerator);

  TestValidator.predicate(
    "moderator account created with active status",
    joinedModerator.account_status === "active",
  );
  TestValidator.equals(
    "created moderator email matches input",
    joinedModerator.email,
    moderatorEmail,
  );

  // Test login with valid credentials
  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: "https://admin.example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Validate login response
  TestValidator.equals(
    "logged in moderator ID matches created moderator",
    loggedInModerator.id,
    joinedModerator.id,
  );
  TestValidator.equals(
    "logged in moderator email matches",
    loggedInModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "account status remains active after login",
    loggedInModerator.account_status,
    "active",
  );

  // Validate JWT tokens
  TestValidator.predicate(
    "access token is present",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is set",
    loggedInModerator.token.expired_at !== null &&
      loggedInModerator.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration is set",
    loggedInModerator.token.refreshable_until !== null &&
      loggedInModerator.token.refreshable_until !== undefined,
  );

  // Validate permissions array
  TestValidator.predicate(
    "permissions array is present",
    Array.isArray(loggedInModerator.permissions),
  );
  TestValidator.predicate(
    "moderator has moderation permissions",
    loggedInModerator.permissions.length > 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp is set",
    loggedInModerator.created_at !== null &&
      loggedInModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    loggedInModerator.updated_at !== null &&
      loggedInModerator.updated_at !== undefined,
  );
}
