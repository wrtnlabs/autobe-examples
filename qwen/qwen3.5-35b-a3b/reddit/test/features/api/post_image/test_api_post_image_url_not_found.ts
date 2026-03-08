import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_posts_images_create_image } from "../../../generate/generate_random_reddit_platform_member_posts_images_create_image";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_image } from "../../../prepare/prepare_random_reddit_platform_post_image";

export async function test_api_post_image_url_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create community for the post
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscribeConnection: api.IConnection = { host: connection.host };
  await generate_random_reddit_platform_member_communities_subscribe(
    subscribeConnection,
    {
      body: { confirmSubscription: true },
      params: { communityId: community.id },
    },
  );
  // 4. Create IMAGE-type post in the subscribed community
  const postConnection: api.IConnection = { host: connection.host };
  const post = await generate_random_reddit_platform_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "IMAGE",
        redditPlatformCommunityId: community.id,
        imageUrl: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      },
    },
  );
  typia.assert(post);
  // 5. Upload image metadata to create a valid image record
  const imageConnection: api.IConnection = { host: connection.host };
  const image =
    await generate_random_reddit_platform_member_posts_images_create_image(
      imageConnection,
      {
        params: { postId: post.id },
        body: {
          filename: RandomGenerator.name(),
          mime_type: typia.random<"image/jpeg" | "image/png" | "image/gif">(),
          file_size: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(image);
  const validImageId = image.id;
  // 6. Test: Try to retrieve image URL with valid postId but INVALID imageId (404 case)
  const invalidImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that the valid image can be retrieved first (sanity check)
  const validImageUrl = await api.functional.redditPlatform.posts.images.at(
    { host: connection.host },
    { postId: post.id, imageId: validImageId },
  );
  typia.assert(validImageUrl);
  TestValidator.equals(
    "valid image URL retrieved",
    validImageUrl.imageUri !== "",
    true,
  );
  // Test invalid imageId returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent image",
    404,
    async () => {
      await api.functional.redditPlatform.posts.images.at(
        { host: connection.host },
        { postId: post.id, imageId: invalidImageId },
      );
    },
  );
}
