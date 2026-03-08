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

/**
 * Test the primary success path for attaching an image to an image-type post.
 *
 * Prerequisites:
 * 1. Register and authenticate a new member account
 * 2. Create an image-type post (contentType: 'image')
 *
 * Test Execution:
 * - Attach an image to the created post
 *
 * Validation:
 * - Response contains valid ICommunityPlatformPostImage.ISummary
 * - mime_type is valid image format
 * - order is non-negative
 * - All CDN URLs are present
 */
export async function test_api_post_image_attach_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Create an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        contentType: "image",
      },
    },
  );
  typia.assert(post);
  // Verify post was created as image type
  TestValidator.equals(
    "post content_type is image",
    post.content_type,
    "image",
  );
  // Step 3: Attach an image to the post
  const attachedImage =
    await generate_random_community_platform_member_posts_images_attach_image(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(attachedImage);
  // Step 4: Business logic validation
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  TestValidator.predicate(
    "mime_type is valid image format",
    validMimeTypes.includes(attachedImage.mime_type),
  );
  TestValidator.predicate("order is non-negative", attachedImage.order >= 0);
}
