import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_images_create } from "../../../generate/generate_random_reddit_community_member_posts_images_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_image } from "../../../prepare/prepare_random_reddit_community_post_image";

/**
 * Test that a non-author member cannot delete images from another user's post.
 *
 * This test verifies the ownership validation logic for post image deletion:
 * 1. First member (author) creates a community and an image post with an attached image
 * 2. Second member (non-author) attempts to delete the image from the first member's post
 * 3. The deletion request should be rejected with access denied error
 *
 * Business Rule: Only the post author can delete images from their posts.
 * Community membership or subscription status does not grant image deletion rights.
 */
export async function test_api_post_image_deletion_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Register second member (attempted image deleter)
  const deleterConnection: api.IConnection = { host: connection.host };
  const deleterAuth = await authorize_member_join(deleterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(deleterAuth);
  // 3. First member creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. First member subscribes to their community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      authorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. First member creates an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        image_path: RandomGenerator.alphabets(10),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. First member uploads an image to their post
  const image =
    await generate_random_reddit_community_member_posts_images_create(
      authorConnection,
      {
        body: {
          filePath: RandomGenerator.alphabets(20),
          fileSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        } satisfies IRedditCommunityPostImage.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(image);
  // 7 & 8. Second member attempts to delete the image - should fail with access denied
  await TestValidator.error("non-author cannot delete post image", async () => {
    await api.functional.redditCommunity.member.posts.images.erase(
      deleterConnection,
      {
        postId: post.id,
        imageId: image.id,
      },
    );
  });
}
