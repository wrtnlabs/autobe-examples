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
import { generate_random_reddit_like_community_member_comment_votes_create } from "../../../generate/generate_random_reddit_like_community_member_comment_votes_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_comment_vote } from "../../../prepare/prepare_random_reddit_like_community_comment_vote";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test unauthorized erasure of another member's comment vote.
 *
 * Validates the complete flow where Member A creates a community, post, comment, and casts a vote, then Member B attempts to erase Member A's vote. The system returns 404 Not Found (not 403 Forbidden) to prevent information leakage about vote existence. Confirms Member A's original vote record remains completely intact after Member B's failed attempt.
 *
 * Special attention is given to verifying that the ownership check correctly blocks mismatched user IDs and returns 404 rather than 403, following the principle of not leaking information about whether a vote exists.
 *
 * 1. Member A registers and authenticates.
 * 2. Member A creates a community.
 * 3. Member A subscribes to the community.
 * 4. Member A creates a post in the community.
 * 5. Member A creates a comment on the post.
 * 6. Member A casts a vote on the comment.
 * 7. Member B registers and authenticates.
 * 8. Member B attempts to erase Member A's vote - expects 404.
 * 9. Validates Member A's vote still exists by successfully erasing it.
 */
export async function test_api_comment_vote_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const aConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(aConnection, { body: {} });
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      aConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    aConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Member A creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    aConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      aConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Member A casts a vote on the comment
  const commentVote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      aConnection,
      {
        body: { comment_id: comment.id },
      },
    );
  typia.assert(commentVote);
  // 7. Member B registers and authenticates
  const bConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(bConnection, { body: {} });
  // 8. Member B attempts to erase Member A's vote - expects 404
  await TestValidator.httpError(
    "unauthorized erase returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.comment_votes.erase(
        bConnection,
        {
          commentVoteId: commentVote.id,
        },
      );
    },
  );
  // 9. Validate Member A's vote still exists by successfully erasing it
  await api.functional.redditLikeCommunity.member.comment_votes.erase(
    aConnection,
    {
      commentVoteId: commentVote.id,
    },
  );
}
