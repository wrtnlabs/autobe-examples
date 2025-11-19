import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator token refresh workflow with active account.
 *
 * This test validates the token refresh mechanism for moderator authentication.
 * It verifies that active moderators can successfully refresh their access
 * tokens using valid refresh tokens, and that the refresh process maintains
 * session continuity while issuing new tokens.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account via join endpoint
 * 2. Login successfully to obtain initial access and refresh tokens
 * 3. Perform first token refresh and verify new tokens are issued
 * 4. Perform second token refresh to ensure multiple refreshes work
 * 5. Verify moderator profile data remains consistent across all operations
 * 6. Confirm moderator account remains active throughout the workflow
 */
export async function test_api_moderator_token_refresh_inactive_moderator(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const createBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(createdModerator);

  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "created moderator username matches",
    createdModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "created moderator is active",
    createdModerator.is_active,
    true,
  );

  const initialRefreshToken = createdModerator.token.refresh;

  const loginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInModerator);

  TestValidator.equals(
    "logged in moderator ID matches",
    loggedInModerator.id,
    createdModerator.id,
  );
  TestValidator.predicate(
    "login issued new refresh token",
    loggedInModerator.token.refresh !== initialRefreshToken,
  );

  const firstRefreshBody = {
    refresh_token: loggedInModerator.token.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const firstRefreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: firstRefreshBody,
    },
  );
  typia.assert(firstRefreshedModerator);

  TestValidator.equals(
    "first refresh moderator ID matches",
    firstRefreshedModerator.id,
    createdModerator.id,
  );
  TestValidator.predicate(
    "first refresh issued new access token",
    firstRefreshedModerator.token.access !== loggedInModerator.token.access,
  );
  TestValidator.equals(
    "moderator remains active after first refresh",
    firstRefreshedModerator.is_active,
    true,
  );

  const secondRefreshBody = {
    refresh_token: firstRefreshedModerator.token.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const secondRefreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: secondRefreshBody,
    },
  );
  typia.assert(secondRefreshedModerator);

  TestValidator.equals(
    "second refresh moderator ID matches",
    secondRefreshedModerator.id,
    createdModerator.id,
  );
  TestValidator.predicate(
    "second refresh issued new access token",
    secondRefreshedModerator.token.access !==
      firstRefreshedModerator.token.access,
  );
  TestValidator.equals(
    "moderator email consistent across refreshes",
    secondRefreshedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username consistent across refreshes",
    secondRefreshedModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator remains active after second refresh",
    secondRefreshedModerator.is_active,
    true,
  );
}
