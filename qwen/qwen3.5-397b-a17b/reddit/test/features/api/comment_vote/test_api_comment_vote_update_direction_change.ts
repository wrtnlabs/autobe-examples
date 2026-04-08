import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_comments_votes_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment vote update direction change from upvote to downvote.
 *
 * Validates the complete vote update workflow including member authentication, community creation, subscription, post creation, comment creation, initial vote casting, and vote direction update. Ensures that the vote value correctly changes from +1 to -1 while preserving the vote record identity.
 *
 * Special attention is given to verifying that only the vote value and updated_at timestamp change during the update, while id and created_at remain constant. The test also confirms the vote record remains active after the update.
 *
 * 1. Member joins and authenticates via authorization utility.
 * 2. Member creates a community as the container for content.
 * 3. Member subscribes to the created community to enable posting.
 * 4. Member creates a text post in the community.
 * 5. Member creates a top-level comment on the post.
 * 6. Member casts an initial upvote (+1) on the comment.
 * 7. Member updates the vote to downvote (-1) using PUT endpoint.
 * 8. Validates updated vote value equals -1.
 * 9. Validates updated_at timestamp is newer than created_at.
 * 10. Validates vote record remains active (deleted_at is null).
 */
export async function test_api_comment_vote_update_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
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
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(comment);
  // 6. Cast initial upvote (+1)
  const initialVote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: { value: 1 },
      },
    );
  typia.assert(initialVote);
  // 7. Update vote to downvote (-1)
  const updatedVote =
    await api.functional.redditCommunity.member.comments.votes.putByCommentidAndVoteid(
      memberConnection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
        body: { value: -1 },
      },
    );
  typia.assert(updatedVote);
  // 8. Validate vote value changed to -1
  TestValidator.equals("vote value updated", updatedVote.value, -1);
  // 9. Validate updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at newer than created_at",
    new Date(updatedVote.updated_at).getTime() >
      new Date(updatedVote.created_at).getTime(),
  );
  // 10. Validate vote record remains active
  TestValidator.equals("vote not deleted", updatedVote.deleted_at, null);
  // 11. Validate vote identity preserved
  TestValidator.equals("vote id unchanged", updatedVote.id, initialVote.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
}
