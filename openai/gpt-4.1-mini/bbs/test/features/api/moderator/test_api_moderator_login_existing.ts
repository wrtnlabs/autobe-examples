import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // 1. Create a moderator account by calling the join API

  // Create moderator creation request body with valid email, password, and display name
  const moderatorCreateBody: IDiscussionBoardModerator.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    display_name: RandomGenerator.name(),
  };

  // Call joinModerator API
  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(createdModerator);

  // 2. Login as the created moderator via login API

  // Create login request body
  const loginBody: IDiscussionBoardModerator.ILogin = {
    email: moderatorCreateBody.email,
    password: moderatorCreateBody.password,
  };

  // Call loginModerator API
  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: loginBody,
    });
  typia.assert(loggedInModerator);

  // Validate that login returns valid token with access and refresh tokens and timestamps
  TestValidator.predicate(
    "login returns access token",
    typeof loggedInModerator.token.access === "string" &&
      loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    typeof loggedInModerator.token.refresh === "string" &&
      loggedInModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login returns expired_at timestamp",
    typeof loggedInModerator.token.expired_at === "string" &&
      loggedInModerator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login returns refreshable_until timestamp",
    typeof loggedInModerator.token.refreshable_until === "string" &&
      loggedInModerator.token.refreshable_until.length > 0,
  );
}
