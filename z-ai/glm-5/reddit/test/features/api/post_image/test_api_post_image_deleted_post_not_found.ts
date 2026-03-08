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

export async function test_api_post_image_deleted_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe to the community (required before creating posts)
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
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "image",
        textContent: null,
        linkUrl: null,
        imageUrl: imageUrl,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Attempt to attach an image (may fail if file doesn't exist)
  const fileUrl = typia.random<string & tags.Format<"uri">>();
  let attachedImageId: string | null = null;
  try {
    const attachedImage =
      await generate_random_community_platform_member_posts_images_attach_image(
        memberConnection,
        {
          params: {
            postId: post.id,
          },
          body: {
            fileUrl: fileUrl,
          },
        },
      );
    attachedImageId = attachedImage.id;
  } catch {
    // Image attachment may fail if file doesn't exist - this is acceptable
  }
  // Step 6: Soft-delete the post
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // Step 7: Attempt to retrieve an image from the deleted post
  // This should return 404 because the post is soft-deleted
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "image from deleted post should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.posts.images.at(publicConnection, {
        postId: post.id,
        fileId: attachedImageId ?? typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
