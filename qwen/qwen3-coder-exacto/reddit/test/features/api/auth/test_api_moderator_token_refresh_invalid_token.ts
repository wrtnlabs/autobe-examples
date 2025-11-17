import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // First, we need to create a moderator account
  // According to dependencies, we need to join first
  const moderatorJoinBody = {
    community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityForumCommunityModerator.ICreate;

  // Since we don't have access to user creation API, we'll simulate having a user ID
  // In a real scenario, this would come from an existing user
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);

  // Login as moderator with mock credentials since we don't have real user credentials
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  try {
    const loginResponse = await api.functional.auth.moderator.login(
      connection,
      {
        body: loginBody,
      },
    );
    typia.assert(loginResponse);

    // Now test refresh with invalid token
    const invalidRefreshToken = "invalid_refresh_token_string";

    const refreshBody = {
      refresh_token: invalidRefreshToken,
    } satisfies ICommunityForumCommunityModerator.IRefresh;

    // This should throw an error
    await TestValidator.error(
      "refresh with invalid token should fail",
      async () => {
        await api.functional.auth.moderator.refresh(connection, {
          body: refreshBody,
        });
      },
    );
  } catch (error) {
    // If login fails (expected since we're using fake credentials),
    // we'll test the refresh with invalid token directly
    const invalidRefreshToken = "invalid_refresh_token_string";

    const refreshBody = {
      refresh_token: invalidRefreshToken,
    } satisfies ICommunityForumCommunityModerator.IRefresh;

    // This should throw an error
    await TestValidator.error(
      "refresh with invalid token should fail",
      async () => {
        await api.functional.auth.moderator.refresh(connection, {
          body: refreshBody,
        });
      },
    );
  }
}
