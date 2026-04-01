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
import { generate_random_reddit_community_comments_votes_vote } from "../../../generate/generate_random_reddit_community_comments_votes_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test comment vote creation workflow.
 * 1. Member joins and authenticates
 * 2. Member creates a community
 * 3. Member subscribes to the community
 * 4. Member creates a post in the community
 * 5. Member creates a comment on the post
 * 6. Member casts UPVOTE on the comment
 * 7. Validate vote record and score changes
 * 8. Test changing vote from UPVOTE to DOWNVOTE
 * 9. Test removing vote
 */
export async function test_api_comment_vote_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Cast UPVOTE on comment
  const upvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: { direction: "UPVOTE" },
    },
  );
  typia.assert(upvote);
  // 7. Validate vote record
  TestValidator.equals("vote direction is UPVOTE", upvote.direction, "UPVOTE");
  TestValidator.equals("vote member matches", upvote.member.id, memberAuth.id);
  TestValidator.equals("vote comment matches", upvote.comment.id, comment.id);
  // 8. Change vote from UPVOTE to DOWNVOTE
  const downvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: { direction: "DOWNVOTE" },
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "vote direction changed to DOWNVOTE",
    downvote.direction,
    "DOWNVOTE",
  );
  // 9. Remove vote
  const removedVote =
    await generate_random_reddit_community_comments_votes_vote(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: { direction: null },
      },
    );
  typia.assert(removedVote);
  TestValidator.equals(
    "vote direction is null after removal",
    removedVote.direction,
    null,
  );
}