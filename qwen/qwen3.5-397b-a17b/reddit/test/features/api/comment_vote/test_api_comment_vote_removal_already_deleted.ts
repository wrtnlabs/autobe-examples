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
 * Test edge case scenario where a member attempts to remove a vote that has already been deleted.
 *
 * Validates the complete vote deletion workflow including member authentication, community setup, post and comment creation, vote casting, and the idempotent behavior of vote deletion. Ensures that attempting to delete an already-deleted vote results in a 404 Not Found error.
 *
 * Special attention is given to verifying that the system properly validates the deleted_at timestamp before allowing deletion operations, and that the second deletion attempt is rejected with appropriate error messaging.
 *
 * 1. Member authenticates via /redditCommunity/auth/member/join.
 * 2. Community is created via /redditCommunity/member/communities.
 * 3. Member subscribes to community via /redditCommunity/member/member/subscriptions.
 * 4. Post is created in community via /redditCommunity/posts.
 * 5. Comment is created on post via /redditCommunity/member/posts/{postId}/comments.
 * 6. Member casts vote on comment via /redditCommunity/member/comments/{commentId}/votes.
 * 7. First deletion removes the vote successfully.
 * 8. Second deletion attempt is rejected with 404 Not Found.
 */
export async function test_api_comment_vote_removal_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to community
  await generate_random_reddit_community_member_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Cast vote on comment
  const vote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote);
  // 7. First deletion - should succeed
  await api.functional.redditCommunity.member.comments.votes.erase(
    memberConnection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  // 8. Second deletion attempt - should fail with 404
  await TestValidator.error(
    "already deleted vote cannot be deleted again",
    async () => {
      await api.functional.redditCommunity.member.comments.votes.erase(
        memberConnection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
}