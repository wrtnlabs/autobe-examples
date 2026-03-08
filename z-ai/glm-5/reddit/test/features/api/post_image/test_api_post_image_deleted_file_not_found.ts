import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_images_attach_image } from "../../../generate/generate_random_community_platform_member_posts_images_attach_image";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that retrieving a deleted image file from a post returns 404 Not Found
 * even when the post still exists. This validates the business rule that when
 * an image is removed from a post, it becomes inaccessible.
 *
 * Flow:
 * 1. Create member, community, subscription
 * 2. Create an image-type post
 * 3. Attach multiple images to the post
 * 4. Verify images are accessible
 * 5. Delete one image from the post
 * 6. Attempt to retrieve the deleted image - expect 404
 */
export async function test_api_post_image_deleted_file_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Step 4: Create an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        contentType: "image",
        textContent: null,
        linkUrl: null,
        imageUrl: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post);
  // Step 5: Attach multiple images to the post
  const image1 =
    await generate_random_community_platform_member_posts_images_attach_image(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          fileUrl: typia.random<string & tags.Format<"uri">>(),
          order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_community_platform_member_posts_images_attach_image(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          fileUrl: typia.random<string & tags.Format<"uri">>(),
          order: 1,
        },
      },
    );
  typia.assert(image2);
  // Step 6: Verify the first image is accessible before deletion
  const accessibleImage =
    await api.functional.communityPlatform.posts.images.at(connection, {
      postId: post.id,
      fileId: image1.id,
    });
  typia.assert(accessibleImage);
  TestValidator.equals("image id matches", accessibleImage.id, image1.id);
  // Step 7: Delete the first image from the post
  await api.functional.communityPlatform.member.posts.images.erase(
    memberConnection,
    {
      postId: post.id,
      fileId: image1.id,
    },
  );
  // Step 8 & 9: Attempt to retrieve the deleted image - expect 404
  await TestValidator.httpError("deleted image should return 404", 404, () =>
    api.functional.communityPlatform.posts.images.at(connection, {
      postId: post.id,
      fileId: image1.id,
    }),
  );
  // Verify the second image is still accessible (post still exists)
  const stillAccessibleImage =
    await api.functional.communityPlatform.posts.images.at(connection, {
      postId: post.id,
      fileId: image2.id,
    });
  typia.assert(stillAccessibleImage);
  TestValidator.equals(
    "second image still accessible",
    stillAccessibleImage.id,
    image2.id,
  );
}
