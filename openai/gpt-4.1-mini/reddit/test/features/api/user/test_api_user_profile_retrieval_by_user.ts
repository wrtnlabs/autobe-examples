import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_profile_retrieval_by_user(
  connection: api.IConnection,
) {
  /*
   * Scenario:
   * 1. Register a new user by calling the join endpoint, to create an authorized user with authentication token.
   * 2. Retrieve the user profile by their unique user ID via the profile retrieval endpoint.
   * 3. Validate that the retrieved user profile's fields match those returned at registration.
   */

  // Step 1: User registration
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://reddit.com/signup",
    referrer: "https://reddit.com",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });

  typia.assert(authorizedUser);

  // Step 2: Retrieve user profile
  const userProfile: IRedditCommunityUser =
    await api.functional.redditCommunity.user.users.profiles.at(connection, {
      userId: authorizedUser.id,
    });

  typia.assert(userProfile);

  // Step 3: Validation
  TestValidator.equals(
    "user id matches",
    userProfile.user_id,
    authorizedUser.id,
  );

  // Validate karma number fields which exist in IRedditCommunityUser
  TestValidator.predicate(
    "post_upvotes is a number",
    typeof userProfile.post_upvotes === "number",
  );
  TestValidator.predicate(
    "post_downvotes is a number",
    typeof userProfile.post_downvotes === "number",
  );
  TestValidator.predicate(
    "comment_upvotes is a number",
    typeof userProfile.comment_upvotes === "number",
  );
  TestValidator.predicate(
    "comment_downvotes is a number",
    typeof userProfile.comment_downvotes === "number",
  );
  TestValidator.predicate(
    "total_karma is a number",
    typeof userProfile.total_karma === "number",
  );
}
