import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that a member can retrieve the vote summary for a post that has received no votes.
 *
 * Validates that the vote summary endpoint correctly returns zero values for posts without any votes. The member authenticates, creates a post, and immediately retrieves the vote summary without casting any votes.
 *
 * This test ensures the endpoint handles posts with no votes gracefully and returns the correct zero values instead of errors or null values.
 *
 * 1. Member authenticates via registration.
 * 2. Member creates a text post in a community.
 * 3. Member retrieves vote summary for the post.
 * 4. Validates all vote counts are zero (vote_score: 0, upvote_count: 0, downvote_count: 0).
 */
export async function test_api_post_vote_summary_zero_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a text post with required community_id
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Retrieve vote summary without casting any votes
  const voteSummary =
    await api.functional.redditLike.member.posts.vote_summary.voteSummary(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteSummary);
  // 4. Validate all vote counts are zero
  TestValidator.equals("vote score is zero", voteSummary.vote_score, 0);
  TestValidator.equals("upvote count is zero", voteSummary.upvote_count, 0);
  TestValidator.equals("downvote count is zero", voteSummary.downvote_count, 0);
  TestValidator.equals("post id matches", voteSummary.id, post.id);
}
