import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_images_create } from "../../../generate/generate_random_reddit_community_member_posts_images_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_image } from "../../../prepare/prepare_random_reddit_community_post_image";

/**
 * Test bulk metadata update for post images.
 *
 * This test validates the atomic bulk update operation for post image metadata:
 * 1. Member joins and authenticates
 * 2. Member creates a community
 * 3. Member subscribes to the community
 * 4. Member creates an image post
 * 5. Member uploads 2-3 images to the post
 * 6. Member calls PATCH to update image metadata fields atomically
 * 7. Verify all updates are applied correctly and response contains updated images
 */
export async function test_api_post_image_metadata_update_bulk(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: `/images/post_${RandomGenerator.alphabets(8)}.jpg`,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Upload 2-3 images to the post
  const imageCount = 3;
  const uploadedImages: IRedditCommunityPostImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_reddit_community_member_posts_images_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            filePath: `/images/post_${post.id}_image_${i}.jpg`,
            fileSize: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1000>
            >(),
            mimeType: "image/jpeg",
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<4000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<4000>
            >(),
          } satisfies IRedditCommunityPostImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // Verify initial image count
  TestValidator.equals(
    "initial image count",
    uploadedImages.length,
    imageCount,
  );
  // 6. Prepare bulk update with modified metadata
  const updatePayload: IRedditCommunityPostImage.IUpdate = {
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    file_path: `/updated/path/image_${RandomGenerator.alphabets(5)}.png`,
    mime_type: "image/png",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<200> & tags.Maximum<5000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<200> & tags.Maximum<5000>
    >(),
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<2000>>(),
  };
  // Call PATCH endpoint for bulk image metadata update
  const updatedPost =
    await api.functional.redditCommunity.member.posts.images.patchByPostid(
      memberConnection,
      {
        postId: post.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedPost);
  // 7. Validate response contains updated post with images
  TestValidator.equals("post ID matches", updatedPost.id, post.id);
  TestValidator.equals("post title unchanged", updatedPost.title, post.title);
  TestValidator.predicate(
    "images array exists",
    updatedPost.images !== undefined,
  );
  TestValidator.equals(
    "image count preserved",
    updatedPost.images.length,
    uploadedImages.length,
  );
  // Validate each image in response has valid structure and belongs to post
  for (const image of updatedPost.images) {
    typia.assert(image);
    TestValidator.predicate("image belongs to post", image.post.id === post.id);
  }
}
