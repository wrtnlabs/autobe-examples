import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserKarma";

export async function test_api_user_karma_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to generate karma data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userUsername = RandomGenerator.name(1)
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
  // Ensure username meets constraints (3-21 characters, alphanumeric and underscores)
  const normalizedUsername =
    userUsername.length < 3
      ? userUsername.padEnd(3, "_")
      : userUsername.length > 21
        ? userUsername.substring(0, 21)
        : userUsername;

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    username: normalizedUsername,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Authenticate as the user to create posts and comments for karma generation
  const userLoginBody = {
    email: userEmail,
    password: userPassword,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
    ip: "127.0.0.1",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const authenticatedUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: userLoginBody,
    });
  typia.assert(authenticatedUser);

  // Step 3: Retrieve the user's karma information by username
  const karma: ICommunityForumCommunityUserKarma =
    await api.functional.communityForum.users.karma.at(connection, {
      username: user.username,
    });
  typia.assert(karma);

  // Step 4: Validate that the karma information is correctly retrieved
  TestValidator.equals(
    "karma ID should match user ID",
    karma.community_forum_user_id,
    user.id,
  );
  TestValidator.equals(
    "post karma should be zero for new user",
    karma.post_karma,
    0,
  );
  TestValidator.equals(
    "comment karma should be zero for new user",
    karma.comment_karma,
    0,
  );
  TestValidator.equals(
    "total karma should be zero for new user",
    karma.total_karma,
    0,
  );
  TestValidator.predicate("karma created_at should be valid date", () => {
    try {
      new Date(karma.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("karma updated_at should be valid date", () => {
    try {
      new Date(karma.updated_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "karma deleted_at should be null",
    () => karma.deleted_at === null,
  );

  // Step 5: Test retrieval by another user (unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const karma2: ICommunityForumCommunityUserKarma =
    await api.functional.communityForum.users.karma.at(unauthConnection, {
      username: user.username,
    });
  typia.assert(karma2);

  // Verify that the same karma data is returned
  TestValidator.equals(
    "karma data should be same for authenticated and unauthenticated users",
    karma,
    karma2,
  );
}
