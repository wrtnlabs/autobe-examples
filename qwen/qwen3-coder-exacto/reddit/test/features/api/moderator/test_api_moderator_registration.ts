import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // First, create a regular user account that will be granted moderator privileges
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user_" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Test that we can register the user as a moderator
  const moderatorCreateBody = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // Validate the moderator response contains the expected data
  TestValidator.equals(
    "moderator ID should be valid UUID",
    moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator should reference correct user ID",
    moderator.community_forum_user_id,
    user.id,
  );
  TestValidator.equals(
    "moderator user summary should match original user",
    moderator.user,
    {
      id: user.id,
      username: user.username,
    } satisfies ICommunityForumCommunityUser.ISummary,
  );
  TestValidator.predicate(
    "moderator should have valid created timestamp",
    () => new Date(moderator.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "moderator should have valid updated timestamp",
    () => new Date(moderator.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "moderator should have authorization token",
    () =>
      moderator.token.access.length > 0 && moderator.token.refresh.length > 0,
  );
}
