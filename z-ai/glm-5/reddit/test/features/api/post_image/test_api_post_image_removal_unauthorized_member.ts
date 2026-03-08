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

export async function test_api_post_image_removal_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (post owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A subscribes to a community
  await generate_random_community_platform_member_subscriptions_create(
    memberAConnection,
    {},
  );
  // 3. Member A creates an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        contentType: "image",
        title: RandomGenerator.name(),
        imageUrl: typia.random<string & tags.Format<"uri">>(),
        textContent: null,
        linkUrl: null,
      },
    },
  );
  typia.assert(post);
  // 4. Member A attaches an image to the post
  const image =
    await generate_random_community_platform_member_posts_images_attach_image(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          fileUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image);
  // 5. Create Member B (unauthorized user)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B attempts to delete the image - should get 403 Forbidden
  await TestValidator.httpError(
    "unauthorized member cannot delete another member's image",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.images.erase(
        memberBConnection,
        {
          postId: post.id,
          fileId: image.id,
        },
      );
    },
  );
}
