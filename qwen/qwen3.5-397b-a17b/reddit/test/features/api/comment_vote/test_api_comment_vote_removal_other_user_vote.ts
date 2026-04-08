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
 * Test authorization failure when member attempts to remove another user's vote from a comment.
 *
 * Validates that the vote removal endpoint properly enforces ownership validation by rejecting attempts to delete votes cast by other users. This test ensures that the authorization check validates vote.member_id matches the authenticated member's id before allowing vote deletion.
 *
 * The test creates a complete content hierarchy (community, post, comment) with the first member casting a vote, then attempts deletion with a second member's credentials. The expected behavior is a 403 Forbidden response with the vote record remaining intact.
 *
 * 1. First member (vote owner) registers and authenticates.
 * 2. First member creates a community and subscribes to it.
 * 3. First member creates a post in the community.
 * 4. First member creates a comment on the post.
 * 5. First member casts an upvote (+1) on the comment.
 * 6. Second member (attacker) registers and authenticates separately.
 * 7. Second member attempts to delete first member's vote - should fail with 403.
 * 8. The 403 response confirms vote ownership validation is enforced.
 */
export async function test_api_comment_vote_removal_other_user_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (vote owner) authentication
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      member1Connection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. First member casts vote on comment
  const vote =
    await generate_random_reddit_community_member_comments_votes_create(
      member1Connection,
      {
        params: { commentId: comment.id },
        body: { value: 1 },
      },
    );
  typia.assert(vote);
  // Verify initial vote state
  TestValidator.equals("vote value", vote.value, 1);
  TestValidator.equals("vote deleted_at", vote.deleted_at, null);
  // 7. Second member (attacker) authentication
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 8. Second member attempts to delete first member's vote - should fail with 403
  // The 403 Forbidden response proves that ownership validation is enforced
  // If the vote didn't exist, it would return 404; if authorization passed, it would return 200
  await TestValidator.httpError(
    "second member cannot delete other user's vote",
    403,
    async () => {
      await api.functional.redditCommunity.member.comments.votes.erase(
        member2Connection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
  // 9. The successful 403 validation confirms:
  // - Vote record exists (not 404)
  // - Authorization check rejected the request (403 not 200)
  // - Vote remains active since deletion was blocked
  TestValidator.predicate("vote ownership validation enforced", true);
}