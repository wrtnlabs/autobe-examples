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
 * Test the primary success path where a member casts their first upvote on a comment.
 *
 * Setup:
 * 1. Create voter member account (authentication)
 * 2. Create comment author member account (authentication)
 * 3. Create a community
 * 4. Subscribe the voter member to the community
 * 5. Create a post in the community (by voter member)
 * 6. Create a comment on the post (by comment author member - different from voter)
 *
 * Test Steps:
 * 1. Cast an UPVOTE on the comment using POST /redditCommunity/member/comments/{commentId}/vote
 * 2. Verify the response returns the updated comment summary with vote_score increased by 1
 * 3. Verify the voter can update their vote on the same comment (changes UPVOTE to DOWNVOTE)
 * 4. Verify the comment vote_score reflects the vote change
 * 5. Verify the voter can remove their vote (direction: null)
 */
export async function test_api_comment_vote_first_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create comment author member account (different from voter)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Create a community using author's connection
  const community =
    await generate_random_reddit_community_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe the voter member to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create a text post in the community using voter's connection
  const post = await api.functional.redditCommunity.member.posts.create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post using author's connection
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Verify initial comment voteScore is 0 (full entity has voteScore property)
  TestValidator.equals("initial voteScore is 0", comment.voteScore, 0);
  // 7. Cast an UPVOTE on the comment using voter's connection
  const upvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(upvoteResult);
  // Verify vote_score increased by 1 (from 0 to 1) - ISummary uses vote_score
  TestValidator.equals(
    "vote_score after upvote is 1",
    upvoteResult.vote_score,
    1,
  );
  // 8. Verify voter can update their vote (change UPVOTE to DOWNVOTE)
  const downvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "DOWNVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvoteResult);
  // Verify vote_score changed from 1 to -1 (changing from upvote to downvote = -2 from previous state)
  TestValidator.equals(
    "vote_score after changing to downvote is -1",
    downvoteResult.vote_score,
    -1,
  );
  // 9. Verify voter can remove vote (set direction to null)
  const removeVoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: null,
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(removeVoteResult);
  // Verify vote_score returned to 0 after removing vote
  TestValidator.equals(
    "vote_score after removing vote is 0",
    removeVoteResult.vote_score,
    0,
  );
}
