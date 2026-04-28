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
 * Test comment vote ownership restriction by attempting unauthorized update.
 *
 * Validates that a member cannot update votes belonging to another member. Member A creates a community, subscribes, creates a post, writes a comment, and casts a vote on the comment. Member B then attempts to update that vote using the vote's ID, which should be rejected by the system. The system also enforces that only the authenticated vote owner can modify their vote, rejecting unauthorized access with 403 Forbidden.
 *
 * 1. Member A authenticates via the join endpoint.
 * 2. Member A creates a community for post and comment creation.
 * 3. Member A subscribes to the community to enable post creation.
 * 4. Member A creates a post in the subscribed community.
 * 5. Member A creates a comment on the post.
 * 6. Member A casts a vote on the comment to create the vote record.
 * 7. Member B authenticates as a separate user attempting unauthorized access.
 * 8. Member B attempts to update member A's vote using the vote's ID.
 * 9. Validates that the system returns 403 Forbidden because member B is not the owner.
 */
export async function test_api_comment_vote_ownership_restriction(
  connection: api.IConnection,
) {
  // 1. Member A authenticates via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAInfo: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
    });
  typia.assert(memberAInfo);
  // 2. Member A creates a community for post and comment creation
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community to enable post creation
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the subscribed community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IRedditLikeCommunityPostComment.ICreate>,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Member A casts a vote on the comment to create the vote record
  const vote: IRedditLikeCommunityCommentVote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "upvote",
        } satisfies IRedditLikeCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 7. Member B authenticates as a separate user attempting unauthorized access
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBInfo: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
    });
  typia.assert(memberBInfo);
  // 8. & 9. Member B attempts to update member A's vote using the vote's ID.
  // Validates that the system returns 403 Forbidden because member B is not the owner.
  await TestValidator.error(
    "403 Forbidden for unauthorized vote update",
    async () => {
      await api.functional.redditLikeCommunity.member.comment_votes.update(
        memberBConnection,
        {
          commentVoteId: vote.id,
          body: {
            direction: "downvote",
          } satisfies IRedditLikeCommunityCommentVote.IUpdate,
        },
      );
    },
  );
}
