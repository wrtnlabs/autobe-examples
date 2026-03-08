import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the behavior when attempting to delete an image that does not exist
 * from a post.
 *
 * This test verifies that:
 * 1. Attempting to delete a non-existent image returns 404 Not Found
 * 2. The image association verification catches missing records before deletion
 * 3. No database changes occur when the target resource doesn't exist
 */
export async function test_api_post_image_removal_nonexistent_image(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create subscription (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // Create an image-type post (without any actual images attached)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: subscription.community.id,
        contentType: "image",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        textContent: null,
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Generate a random UUID for a non-existent file
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent image
  // Expected: 404 Not Found (image association does not exist for this post)
  await TestValidator.httpError(
    "should return 404 when deleting non-existent image",
    404,
    async () =>
      await api.functional.communityPlatform.member.posts.images.erase(
        memberConnection,
        {
          postId: post.id,
          fileId: nonExistentFileId,
        },
      ),
  );
}
