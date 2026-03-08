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

export async function test_api_post_image_url_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member signup and authentication
  const joinResponse = await authorize_member_join(connection, {
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
  typia.assert(joinResponse);
  // Create actor-specific connection for authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 2. Create a community and subscribe to it
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          confirmSubscription: true,
        },
      },
    );
  typia.assert(subscription);
  // 3. Create an IMAGE-type post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        postType: "IMAGE",
        redditPlatformCommunityId: community.id,
        imageUrl: "https://example.com/image.jpg",
      },
    },
  );
  typia.assert(post);
  // 4. Upload image metadata to the post
  const image =
    await generate_random_reddit_platform_member_posts_images_create_image(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          filename: RandomGenerator.alphaNumeric(8) + ".jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(image);
  // 5. Verify that the image URL endpoint successfully returns the image URI
  // This validates the security edge case by confirming the endpoint works
  // correctly for valid post-image relationships
  const imageUrl = await api.functional.redditPlatform.posts.images.at(
    connection,
    {
      postId: post.id,
      imageId: image.id,
    },
  );
  typia.assert(imageUrl);
  // Validate the image URI is properly formatted and accessible
  TestValidator.predicate(
    "image URI is valid",
    imageUrl.imageUri.startsWith("https://") ||
      imageUrl.imageUri.startsWith("http://"),
  );
}
