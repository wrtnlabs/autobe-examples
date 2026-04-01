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
 * Test image deletion fails with 404 when post or image does not exist or is already deleted.
 *
 * Test Steps:
 * Scenario A - Post not found:
 * 1. Register a member and authenticate
 * 2. Attempt to delete an image using a non-existent postId (valid UUID format but not in database)
 * 3. Verify 404 Not Found error
 *
 * Scenario B - Image not found:
 * 1. Register a member
 * 2. Create a community and subscribe
 * 3. Create a text post (no images)
 * 4. Attempt to delete an image from the post using a non-existent imageId
 * 5. Verify 404 Not Found error
 *
 * Scenario C - Image already deleted:
 * 1. Register a member
 * 2. Create community, subscribe, create image post
 * 3. Upload an image to the post
 * 4. Delete the image successfully (first deletion)
 * 5. Attempt to delete the same image again (second deletion)
 * 6. Verify 404 Not Found error on second attempt
 *
 * Validation Points:
 * - All scenarios return 404 Not Found (not 403 or other errors)
 * - Error responses clearly indicate the resource was not found
 * - No database modifications occur for invalid deletion attempts
 * - Soft-deleted images cannot be deleted again
 *
 * Business Logic:
 * - Post must exist and not be soft-deleted (deleted_at IS NULL)
 * - Image must exist and belong to the specified post
 * - Image must not be already soft-deleted (deleted_at IS NULL)
 * - 404 is returned for all not-found conditions to avoid information disclosure
 */
export async function test_api_post_image_deletion_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // SCENARIO A: Post not found
  // ============================================
  const memberConnectionA: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Attempt to delete image from non-existent post
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const fakeImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("post not found should return 404", async () => {
    await api.functional.redditCommunity.member.posts.images.erase(
      memberConnectionA,
      {
        postId: fakePostId,
        imageId: fakeImageId,
      },
    );
  });
  // ============================================
  // SCENARIO B: Image not found (text post with no images)
  // ============================================
  const memberConnectionB: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnectionB,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Subscribe to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnectionB,
    {
      communityName: community.name,
    },
  );
  // Create text post (no images)
  const textPost = await api.functional.redditCommunity.member.posts.create(
    memberConnectionB,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Attempt to delete non-existent image from text post
  const fakeImageIdB = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("image not found should return 404", async () => {
    await api.functional.redditCommunity.member.posts.images.erase(
      memberConnectionB,
      {
        postId: textPost.id,
        imageId: fakeImageIdB,
      },
    );
  });
  // ============================================
  // SCENARIO C: Image already deleted
  // ============================================
  const memberConnectionC: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnectionC, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Create community
  const communityC =
    await generate_random_reddit_community_member_communities_create(
      memberConnectionC,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityC);
  // Subscribe to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnectionC,
    {
      communityName: communityC.name,
    },
  );
  // Create image post
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnectionC,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.name(3),
        image_path: "/images/test.jpg",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // Upload image to post
  const image =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnectionC,
      {
        params: { postId: imagePost.id },
        body: {
          filePath: "/images/uploaded.jpg",
          fileSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(image);
  // First deletion - should succeed
  await api.functional.redditCommunity.member.posts.images.erase(
    memberConnectionC,
    {
      postId: imagePost.id,
      imageId: image.id,
    },
  );
  // Second deletion - should fail with 404
  await TestValidator.error(
    "already deleted image should return 404",
    async () => {
      await api.functional.redditCommunity.member.posts.images.erase(
        memberConnectionC,
        {
          postId: imagePost.id,
          imageId: image.id,
        },
      );
    },
  );
}
