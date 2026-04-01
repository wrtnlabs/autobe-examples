import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test removing a downvote from a comment to verify opposite score adjustment behavior.
 *
 * Test Flow:
 * 1. Create two member accounts (voter and comment author)
 * 2. Voter creates a community and subscribes to it
 * 3. Voter creates a post in the community
 * 4. Comment author creates a comment on the post
 * 5. Voter casts a downvote on the comment
 * 6. Verify comment score is -1 after downvote
 * 7. Voter removes the vote using DELETE endpoint
 * 8. Verify vote removal by casting downvote again and confirming score returns to -1
 *
 * This tests that score adjustments work correctly for both vote directions.
 */
export async function test_api_comment_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpass123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voterAuth);
  // 2. Create comment author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpass123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorAuth);
  // 3. Voter creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // 4. Voter subscribes to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Voter creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 6. Comment author creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 7. Record initial comment score (should be 0)
  const initialScore = comment.voteScore;
  // 8. Voter casts a downvote on the comment
  const downvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: { direction: "DOWNVOTE" },
      },
    );
  typia.assert(downvoteResult);
  // 9. Verify comment score is now -1 (initial - 1 for downvote)
  TestValidator.equals(
    "comment score after downvote",
    downvoteResult.vote_score,
    initialScore - 1,
  );
  // 10. Voter removes the vote using DELETE endpoint
  await api.functional.redditCommunity.member.comments._vote.erase(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  // 11. Verify vote removal by casting downvote again - score should return to -1
  // This proves the vote was successfully removed (score went back to 0) and can be cast again
  const downvoteResult2 =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: { direction: "DOWNVOTE" },
      },
    );
  typia.assert(downvoteResult2);
  // 12. Verify comment score is back to -1 (proving vote was removed and re-added)
  TestValidator.equals(
    "comment score after vote removal and re-downvote",
    downvoteResult2.vote_score,
    initialScore - 1,
  );
}