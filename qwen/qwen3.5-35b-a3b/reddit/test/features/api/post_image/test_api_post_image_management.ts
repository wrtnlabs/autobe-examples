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

export async function test_api_post_image_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member and create subscribed community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  await generate_random_reddit_platform_member_communities_subscribe(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 2. Create IMAGE-type post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "IMAGE" as const,
        redditPlatformCommunityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 3. Upload first image
  const firstImage =
    await generate_random_reddit_platform_member_posts_images_create_image(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filename: RandomGenerator.alphaNumeric(8) + ".jpg",
          mime_type: "image/jpeg" as const,
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
        },
      },
    );
  typia.assert(firstImage);
  // 4. Retrieve first image to verify
  const firstImageRetrieved =
    await api.functional.redditPlatform.posts.images.manageImages(
      memberConnection,
      {
        postId: post.id,
        body: typia.random<IRedditPlatformPostImage.IRequest>(),
      },
    );
  typia.assert(firstImageRetrieved);
  // Validate first image appears in list
  TestValidator.equals(
    "first image id matches",
    firstImageRetrieved.id,
    firstImage.id,
  );
  TestValidator.equals(
    "first image filename matches",
    firstImageRetrieved.filename,
    firstImage.filename,
  );
  TestValidator.equals(
    "first image mime_type matches",
    firstImageRetrieved.mime_type,
    firstImage.mime_type,
  );
  TestValidator.equals(
    "first image file_size matches",
    firstImageRetrieved.file_size,
    firstImage.file_size,
  );
  TestValidator.equals(
    "first image deleted_at is null",
    firstImageRetrieved.deleted_at,
    null,
  );
  TestValidator.predicate(
    "first image has file_path",
    firstImageRetrieved.file_path !== null,
  );
  // 5. Upload second image
  const secondImage =
    await generate_random_reddit_platform_member_posts_images_create_image(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filename: RandomGenerator.alphaNumeric(8) + ".png",
          mime_type: "image/png" as const,
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
        },
      },
    );
  typia.assert(secondImage);
  // 6. Verify second image exists
  const secondImageRetrieved =
    await api.functional.redditPlatform.posts.images.manageImages(
      memberConnection,
      {
        postId: post.id,
        body: typia.random<IRedditPlatformPostImage.IRequest>(),
      },
    );
  typia.assert(secondImageRetrieved);
  // Validate both images exist
  TestValidator.equals(
    "second image id matches",
    secondImageRetrieved.id,
    secondImage.id,
  );
  TestValidator.equals(
    "second image filename matches",
    secondImageRetrieved.filename,
    secondImage.filename,
  );
  TestValidator.predicate(
    "images have different ids",
    firstImage.id !== secondImage.id,
  );
  TestValidator.predicate(
    "images have different filenames",
    firstImage.filename !== secondImage.filename,
  );
}
