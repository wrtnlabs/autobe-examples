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
 * Test comment vote removal functionality.
 *
 * This test verifies that a member can remove their existing vote from a comment
 * by sending direction: null, and that the comment's vote_score is correctly
 * updated. It also verifies that after removing a vote, the member can cast
 * a new vote on the same comment.
 *
 * Setup:
 * 1. Create voter member account
 * 2. Create comment author member account
 * 3. Create a community
 * 4. Subscribe voter to the community
 * 5. Create a post in the community
 * 6. Create a comment on the post (by comment author)
 * 7. Cast initial UPVOTE on the comment (by voter)
 *
 * Test Steps:
 * 1. Remove the vote by sending direction: null
 * 2. Verify vote_score decreased by 1 (from +1 to 0)
 * 3. Cast a DOWNVOTE on the same comment
 * 4. Verify vote_score decreased by 1 (from 0 to -1)
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
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
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorAuth);
  // 3. Create a community (using voter)
  const community =
    await generate_random_reddit_community_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // 4. Subscribe voter to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create a post in the community (using voter)
  const post = await api.functional.redditCommunity.member.posts.create(
    voterConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post (using author)
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Cast initial UPVOTE on the comment (using voter)
  const upvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          direction: "UPVOTE",
        },
      },
    );
  typia.assert(upvoteResult);
  // Verify initial upvote increased score to 1
  TestValidator.equals("upvote score", upvoteResult.vote_score, 1);
  // 8. Remove the vote by sending direction: null
  const removeVoteResult =
    await api.functional.redditCommunity.member.comments.vote(voterConnection, {
      commentId: comment.id,
      body: {
        direction: null,
      },
    });
  typia.assert(removeVoteResult);
  // 9. Verify vote_score decreased by 1 (from +1 to 0)
  TestValidator.equals("vote removal score", removeVoteResult.vote_score, 0);
  TestValidator.notEquals(
    "vote score changed after removal",
    upvoteResult.vote_score,
    removeVoteResult.vote_score,
  );
  // 10. Cast a DOWNVOTE on the same comment to verify vote can be re-established
  const downvoteResult =
    await api.functional.redditCommunity.member.comments.vote(voterConnection, {
      commentId: comment.id,
      body: {
        direction: "DOWNVOTE",
      },
    });
  typia.assert(downvoteResult);
  // 11. Verify vote_score decreased by 1 (from 0 to -1)
  TestValidator.equals("downvote score", downvoteResult.vote_score, -1);
  TestValidator.notEquals(
    "vote score changed after downvote",
    removeVoteResult.vote_score,
    downvoteResult.vote_score,
  );
}
