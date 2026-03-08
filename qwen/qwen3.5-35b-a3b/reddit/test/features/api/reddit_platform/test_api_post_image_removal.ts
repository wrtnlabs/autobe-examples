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

export async function test_api_post_image_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication and community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(12) satisfies string,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // Update connection headers with member token
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;
  // 2. Create community and subscribe
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8) satisfies string,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  // 3. Create IMAGE-type post
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "IMAGE" as const,
        redditPlatformCommunityId: community.id,
        imageUrl: RandomGenerator.alphaNumeric(20) satisfies string &
          tags.Format<"uri">,
      },
    });
  typia.assert(post);
  // 4. Upload 3 images
  const uploadedImages: IRedditPlatformPostImage[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const image: IRedditPlatformPostImage =
        await api.functional.redditPlatform.member.posts.images.createImage(
          memberConnection,
          {
            postId: post.id,
            body: {
              filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
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
      typia.assert(image);
      return image;
    });
  // 5. Retrieve image list to verify all 3 images exist with deleted_at=null
  const imageList1Response =
    await api.functional.redditPlatform.posts.images.manageImages(
      memberConnection,
      {
        postId: post.id,
        body: { operation: "retrieve" },
      },
    );
  const imageList1 = Array.isArray(imageList1Response)
    ? imageList1Response
    : [imageList1Response];
  const activeImages1 = imageList1.filter((img) => img.deleted_at === null);
  TestValidator.equals("initial active image count", activeImages1.length, 3);
  // Verify all images have deleted_at=null
  for (const img of activeImages1) {
    TestValidator.equals("image deleted_at is null", img.deleted_at, null);
  }
  // 6. Remove one image using PATCH /posts/{postId}/images
  const imageToRemove = activeImages1[0];
  const manageImagesResponse2 =
    await api.functional.redditPlatform.posts.images.manageImages(
      memberConnection,
      {
        postId: post.id,
        body: {
          operation: "remove",
          imageIds: [imageToRemove.id],
        },
      },
    );
  typia.assert(manageImagesResponse2);
  // 7. Retrieve image list again after removal
  const imageList2Response =
    await api.functional.redditPlatform.posts.images.manageImages(
      memberConnection,
      {
        postId: post.id,
        body: { operation: "retrieve" },
      },
    );
  const imageList2 = Array.isArray(imageList2Response)
    ? imageList2Response
    : [imageList2Response];
  // Verify removed image has deleted_at set
  const removedImageRecord = imageList2.find(
    (img) => img.id === imageToRemove.id,
  );
  TestValidator.predicate(
    "removed image has deleted_at set",
    () =>
      removedImageRecord !== undefined &&
      removedImageRecord.deleted_at !== null,
  );
  // Verify removed image excluded from active list
  const activeImages2 = imageList2.filter((img) => img.deleted_at === null);
  TestValidator.equals(
    "active image count after removal",
    activeImages2.length,
    2,
  );
  TestValidator.notEquals(
    "image count decreased",
    activeImages1.length,
    activeImages2.length,
  );
  // Verify other 2 images remain with deleted_at=null
  for (const img of activeImages2) {
    TestValidator.equals(
      "remaining image deleted_at is null",
      img.deleted_at,
      null,
    );
  }
}
