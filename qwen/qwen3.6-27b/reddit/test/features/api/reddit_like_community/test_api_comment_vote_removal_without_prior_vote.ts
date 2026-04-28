import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Validates vote removal when no vote exists for the authenticated member on a comment.
 *
 * Tests the business rule that prevents removing votes that were never cast. A member is authenticated, a comment exists created by another member, but no vote record exists for this member-comment combination. The system should reject the removal attempt with a 404 Not Found error, confirming that vote removal operations are state-management constraints requiring an existing vote record, not phantom delete operations.
 *
 * 1. Register Member A who will create the comment.
 * 2. Member A creates a community.
 * 3. Member A subscribes to the community.
 * 4. Member A creates a post in the community.
 * 5. Member A creates a comment on the post.
 * 6. Register Member B who will attempt vote removal without casting a vote.
 * 7. Member B attempts to remove their vote on the comment.
 * 8. The system returns a 404 error since no vote exists.
 */
export async function test_api_comment_vote_removal_without_prior_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "memberA",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Member A creates a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberAConnection,
      {
        body: {
          title: "Test Post",
          post_type: "text",
          community_id: community.id,
          body: "This is a test post body.",
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          body: "This is a test comment.",
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Register and authenticate Member B (who will attempt vote removal)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: "memberB",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 7 & 8. Member B attempts to remove their vote on the comment (without having cast one)
  // This should fail with 404 Not Found since no vote exists for Member B on this comment
  await TestValidator.httpError(
    "removing a vote that was never cast should return 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.votes.comments.remove.retract(
        memberBConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
