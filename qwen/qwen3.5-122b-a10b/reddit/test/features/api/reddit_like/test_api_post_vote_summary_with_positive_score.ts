import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test that a member can retrieve the vote summary for a post with positive votes.
 *
 * Validates the complete voting workflow including member authentication, post creation, vote casting, and vote summary retrieval. Ensures that the vote summary correctly reflects the upvote with accurate count and score calculations.
 *
 * This test requires a pre-existing community and subscription for the member, as community creation and subscription endpoints are not available in the current SDK. The test focuses on validating the vote summary endpoint's real-time aggregation logic.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a text post in a pre-existing community (community_id must exist).
 * 3. Cast an upvote on the created post.
 * 4. Retrieve the vote summary for the post.
 * 5. Validates upvote_count equals 1, downvote_count equals 0, and vote_score equals 1.
 * 6. Validates the post ID in the summary matches the created post.
 */
export async function test_api_post_vote_summary_with_positive_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a text post (requires pre-existing community and subscription)
  // Note: This test assumes a valid community_id exists and member is subscribed
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Cast an upvote on the created post
  const vote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  // 4. Retrieve the vote summary for the post
  const voteSummary =
    await api.functional.redditLike.member.posts.vote_summary.voteSummary(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteSummary);
  // 5. Validate vote summary matches expected values
  TestValidator.equals("post id matches", voteSummary.id, post.id);
  TestValidator.equals("upvote count is 1", voteSummary.upvote_count, 1);
  TestValidator.equals("downvote count is 0", voteSummary.downvote_count, 0);
  TestValidator.equals("vote score is 1", voteSummary.vote_score, 1);
}
