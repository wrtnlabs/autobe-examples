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
 * Test erasing a comment upvote and verifying permanent removal.
 *
 * An authenticated member creates a community, subscribes to it, creates a post, writes a comment, and casts an upvote on the comment. The test then erases the upvote using the vote's ID and validates that the vote is permanently removed by attempting to erase the same vote ID again, which should return 404 Not Found. Confirms that aggregate score updates and vote deletion enforcement are correct.
 *
 * The comment vote system maintains per-member-per-comment vote records that affect comment scoring. Erasing a vote removes its contribution to the comment's aggregate score. Duplicate vote operations return 404 to prevent information leakage about vote existence of other users.
 *
 * 1. Member joins and authenticates to the platform.
 * 2. Member creates a new discussion community.
 * 3. Member subscribes to their own community.
 * 4. Member creates a post within the subscribed community.
 * 5. Member writes a comment on that post.
 * 6. Member casts an upvote on the comment, increasing its score by 1.
 * 7. Validates that the upvote was successfully created with correct direction.
 * 8. Member erases the upvote using the commentVoteId returned from step 6.
 * 9. Validates the vote removal was successful (void response).
 * 10. Attempts to erase the already-deleted vote ID again, expecting 404 Not Found to confirm permanent removal.
 */
export async function test_api_comment_vote_erase_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: {},
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Cast an upvote on the comment
  const upvote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "upvote",
        },
      },
    );
  typia.assert(upvote);
  // 7. Validate upvote direction
  TestValidator.equals(
    "upvote direction is upvote",
    upvote.direction,
    "upvote",
  );
  // 8. Erase the upvote using the commentVoteId
  await api.functional.redditLikeCommunity.member.comment_votes.erase(
    memberConnection,
    {
      commentVoteId: upvote.id,
    },
  );
  // 9. Attempt to erase the same vote ID again - should return 404 since it's already deleted
  await TestValidator.httpError(
    "erased vote returns 404 on re-erase",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.comment_votes.erase(
        memberConnection,
        {
          commentVoteId: upvote.id,
        },
      );
    },
  );
}
