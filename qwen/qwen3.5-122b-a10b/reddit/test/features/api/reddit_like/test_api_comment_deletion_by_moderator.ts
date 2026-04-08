import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that a community moderator can delete any comment in their community.
 *
 * Validates the moderator authorization path that allows moderators to moderate content in their community. Member A creates a comment on a post, then Member B (who is a moderator of the community) deletes Member A's comment. The operation should succeed with 204 No Content.
 *
 * 1. Authenticate Member A who will create the comment.
 * 2. Authenticate Member B who will act as moderator.
 * 3. Member A creates a community and becomes the owner.
 * 4. Both members subscribe to the community.
 * 5. Member A creates a post in the community.
 * 6. Member B is added as moderator by the owner.
 * 7. Member A creates a comment on the post.
 * 8. Member B (moderator) deletes Member A's comment.
 * 9. Verify the erase operation succeeds (validates moderator authorization).
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (regular member who will create comment)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Authenticate Member B (will become moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create community (Member A as owner)
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Both members subscribe to the community
  await generate_random_reddit_like_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  await generate_random_reddit_like_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 5. Member A creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member B is added as moderator
  await generate_random_reddit_like_member_communities_moderators_create(
    memberAConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: memberB.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    },
  );
  // 7. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // Verify comment was created (deleted_at should be null)
  TestValidator.equals(
    "comment not deleted initially",
    comment.deleted_at,
    null,
  );
  // 8. Member B (moderator) deletes Member A's comment
  // Successful completion validates moderator authorization
  await api.functional.redditLike.member.posts.comments.erase(
    memberBConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
}
