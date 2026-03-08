import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_images_attach_image } from "../../../generate/generate_random_community_platform_member_posts_images_attach_image";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_image_removal_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Subscribe to a community to gain posting privileges
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: subscription.community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "image",
        textContent: null,
        linkUrl: null,
        imageUrl: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post);
  // 4. Attach an image to the post's gallery
  const attachedImage =
    await generate_random_community_platform_member_posts_images_attach_image(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          fileUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(attachedImage);
  // 5. Remove the image from the post's gallery by the author
  await api.functional.communityPlatform.member.posts.images.erase(
    authorConnection,
    {
      postId: post.id,
      fileId: attachedImage.id,
    },
  );
  // 6. Verify the image was removed - attempting to delete again should fail
  await TestValidator.error("image already removed", async () => {
    await api.functional.communityPlatform.member.posts.images.erase(
      authorConnection,
      {
        postId: post.id,
        fileId: attachedImage.id,
      },
    );
  });
  // 7. Verify non-author cannot delete images from other's posts
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  const otherSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      otherMemberConnection,
      {},
    );
  typia.assert(otherSubscription);
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      otherMemberConnection,
      {
        body: {
          communityId: otherSubscription.community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          contentType: "image",
          textContent: null,
          linkUrl: null,
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(otherPost);
  const otherImage =
    await generate_random_community_platform_member_posts_images_attach_image(
      otherMemberConnection,
      {
        params: { postId: otherPost.id },
        body: {
          fileUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(otherImage);
  // Non-author attempts to delete - should fail with 403
  await TestValidator.httpError("non-author cannot delete", 403, async () => {
    await api.functional.communityPlatform.member.posts.images.erase(
      authorConnection,
      {
        postId: otherPost.id,
        fileId: otherImage.id,
      },
    );
  });
}
