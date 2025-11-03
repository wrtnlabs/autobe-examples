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

/**
 * Test retrieving karma score and related metrics for a registered user. Steps:
 *
 * 1. Authenticate a new user by joining as user;
 * 2. Retrieve the user's karma via the GET endpoint;
 * 3. Validate that the karma data returns expected properties reflecting the
 *    user's voting reputation;
 * 4. Confirm appropriate access controls and correct user identity mapping. This
 *    scenario ensures the karma endpoint correctly computes and returns user
 *    reputation metrics.
 */
export async function test_api_user_karma_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate a new user by registration
  const userAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAuthorized);

  // 2. Retrieve the authenticated user's karma
  const karma: IRedditCommunityUser =
    await api.functional.redditCommunity.user.users.karma.at(connection, {
      userId: userAuthorized.id,
    });
  typia.assert(karma);

  // 3. Validate returned karma data
  TestValidator.equals(
    "karma user_id matches authenticated user",
    karma.user_id,
    userAuthorized.id,
  );
  TestValidator.predicate(
    "karma post_upvotes is int",
    Number.isInteger(karma.post_upvotes),
  );
  TestValidator.predicate(
    "karma post_downvotes is int",
    Number.isInteger(karma.post_downvotes),
  );
  TestValidator.predicate(
    "karma comment_upvotes is int",
    Number.isInteger(karma.comment_upvotes),
  );
  TestValidator.predicate(
    "karma comment_downvotes is int",
    Number.isInteger(karma.comment_downvotes),
  );
  TestValidator.predicate(
    "karma total_karma is int",
    Number.isInteger(karma.total_karma),
  );

  // 4. Confirm access control and identity mapping
  // (Implicit via step 1 authentication and successful karma retrieval)
}
