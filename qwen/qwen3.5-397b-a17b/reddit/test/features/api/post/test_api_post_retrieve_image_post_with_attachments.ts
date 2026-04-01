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
 * Test retrieving an image post with image attachments.
 *
 * Workflow:
 * 1. Member joins and authenticates
 * 2. Member creates a community
 * 3. Member subscribes to the community
 * 4. Member creates an image post
 * 5. Member uploads images to the post
 * 6. Member retrieves the post and validates response
 *
 * Validates:
 * - post_type is 'image'
 * - image_path is populated
 * - text_content and link_url are null
 * - images array contains uploaded image metadata
 * - Author and community information are correct
 */
export async function test_api_post_retrieve_image_post_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        image_path: `/storage/posts/${typia.random<string & tags.Format<"uuid">>()}`,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Upload images to the post
  const image1 =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IRedditCommunityPostImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.png`,
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          mimeType: "image/png",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IRedditCommunityPostImage.ICreate,
      },
    );
  typia.assert(image2);
  // 6. Retrieve the post
  const retrievedPost = await api.functional.redditCommunity.member.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // Validate post type and content
  TestValidator.equals("post_type is image", retrievedPost.post_type, "image");
  TestValidator.predicate(
    "image_path is populated",
    retrievedPost.image_path !== null && retrievedPost.image_path !== undefined,
  );
  TestValidator.equals(
    "text_content is null",
    retrievedPost.text_content,
    null,
  );
  TestValidator.equals("link_url is null", retrievedPost.link_url, null);
  // Validate images array
  TestValidator.predicate(
    "images array has at least 2 images",
    retrievedPost.images.length >= 2,
  );
  const firstImage = retrievedPost.images[0];
  TestValidator.predicate(
    "first image file_size is positive",
    firstImage.file_size > 0,
  );
  TestValidator.predicate(
    "first image width is positive",
    firstImage.width > 0,
  );
  TestValidator.predicate(
    "first image height is positive",
    firstImage.height > 0,
  );
  TestValidator.predicate(
    "first image sort_order is non-negative",
    firstImage.sort_order >= 0,
  );
  // Validate author and community
  TestValidator.equals(
    "author matches",
    retrievedPost.author.id,
    authResult.id,
  );
  TestValidator.equals(
    "community matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // Validate comments count is non-negative
  TestValidator.predicate(
    "comments_count is non-negative",
    retrievedPost.comments_count >= 0,
  );
}
