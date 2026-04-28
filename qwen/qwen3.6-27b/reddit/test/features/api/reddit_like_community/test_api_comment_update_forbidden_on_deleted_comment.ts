import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
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
 * Validates that soft-deleted comments cannot be updated by their original author.
 *
 * This test ensures the immutability rule for comments that have been soft-deleted. It simulates a complete workflow: authenticating a member, creating a community, subscribing to it, publishing a post, adding a comment, and intentionally soft-deleting the comment via the DELETE endpoint. Finally, it attempts to modify the body of the now-deleted comment.
 *
 * 1. Authenticates a new member account.
 * 2. Creates a community and subscribes the authenticated member to it.
 * 3. Publishes a text post within the subscribed community.
 * 4. Creates a comment on the post.
 * 5. Soft-deletes the comment using the erase endpoint.
 * 6. Attempts to update the deleted comment's body.
 * 7. Validates that the update request fails with an HTTP 400 Bad Request error.
 */
export async function test_api_comment_update_forbidden_on_deleted_comment(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as a member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.name(),
      href: "http://mock.test",
      referrer: "http://mock.test",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 4. Create a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Soft-delete the comment
  await api.functional.redditLikeCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 7. Attempt to update the deleted comment, expecting 400
  await TestValidator.httpError(
    "update fails on soft-deleted comment",
    400,
    () =>
      api.functional.redditLikeCommunity.member.posts.comments.update(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditLikeCommunityPostComment.IUpdate,
        },
      ),
  );
}