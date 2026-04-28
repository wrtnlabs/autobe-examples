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

export async function test_api_comment_vote_removal(
  connection: api.IConnection,
) {
  // 1. Commenter setup
  const commenterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Voter setup
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Community creation by commenter
  const community: IREdditLikeCommunityCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      commenterConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_uri: null,
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe commenter to community
  const commenterSubscription: IRedditLikeCommunityCommunitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      commenterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(commenterSubscription);
  // 5. Subscribe voter to community
  const voterSubscription: IRedditLikeCommunityCommunitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // 6. Create post by commenter
  const post: IREdditLikeCommunityPost =
    await api.functional.redditLikeCommunity.member.posts.create(
      commenterConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 5 }),
          url: null,
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 7. Create comment by commenter
  const comment: IRedditLikeCommunityPostComment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      commenterConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Voter casts initial upvote
  const initialVote: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.comment_votes.update(
      voterConnection,
      {
        body: {
          commentId: comment.id,
          direction: "upvote",
        } satisfies IRedditLikeCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "Initial vote is upvote",
    initialVote.direction,
    "upvote",
  );
  // 9. Voter removes their vote by setting direction to null
  const removedVote: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.comment_votes.update(
      voterConnection,
      {
        body: {
          commentId: comment.id,
          direction: null,
        } satisfies IRedditLikeCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
}
