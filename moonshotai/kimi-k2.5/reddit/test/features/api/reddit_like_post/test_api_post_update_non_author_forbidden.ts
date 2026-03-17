import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_image } from "../../../prepare/prepare_random_reddit_like_post_image";

/**
 * Test that a non-author member cannot update another member's post.
 * Verifies proper 403 Forbidden authorization enforcement.
 */
export async function test_api_post_update_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as the first member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author: IRedditLikeMember.IAuthorized = await authorize_member_join(
    authorConnection,
    {},
  );
  typia.assert(author);
  // 2. Create a community using the first member
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      authorConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 3. Subscribe the first member to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post using the first member
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(authorConnection, {
      body: {
        community_id: community.id,
        title: "Original Post Title by Author",
        post_type: "text",
        body: "Original post content by author",
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 5. Authenticate as a second member (non-author)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor: IRedditLikeMember.IAuthorized = await authorize_member_join(
    nonAuthorConnection,
    {},
  );
  typia.assert(nonAuthor);
  // Verify the two members are different
  TestValidator.notEquals(
    "non-author should be different from author",
    author.id,
    nonAuthor.id,
  );
  // 6. Attempt to update the post as non-author - should throw 403 Forbidden
  await TestValidator.httpError(
    "non-author should receive 403 Forbidden when updating another's post",
    403,
    async () => {
      await api.functional.redditLike.member.posts.update(nonAuthorConnection, {
        postId: post.id,
        body: {
          title: "Attempted update by non-author",
          body: "This content should not be allowed",
        } satisfies IRedditLikePost.IUpdate,
      });
    },
  );
}