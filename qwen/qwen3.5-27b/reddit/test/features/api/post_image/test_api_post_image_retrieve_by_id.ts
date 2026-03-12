import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_images_create } from "../../../generate/generate_random_reddit_clone_member_posts_images_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";

/**
 * Test retrieving a specific post image by postId and imageId.
 *
 * This test verifies the complete workflow of:
 * 1. Registering a member account
 * 2. Creating a community
 * 3. Creating an image-type post
 * 4. Uploading an image to the post
 * 5. Retrieving the specific image by ID
 *
 * @param connection - Base connection to the API server
 */
export async function test_api_post_image_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post in the community using utility function
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "image",
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Upload an image to the post
  const image = await generate_random_reddit_clone_member_posts_images_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {},
    },
  );
  typia.assert(image);
  // 5. Retrieve the specific image by postId and imageId
  const retrievedImage = await api.functional.redditClone.posts.images.at(
    memberConnection,
    {
      postId: post.id,
      imageId: image.id,
    },
  );
  typia.assert(retrievedImage);
  // 6. Validate the retrieved image
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals("post id matches", retrievedImage.post.id, post.id);
  TestValidator.equals(
    "post type is image",
    retrievedImage.post.post_type,
    "image",
  );
  TestValidator.predicate("sequence is positive", retrievedImage.sequence >= 1);
  TestValidator.predicate("has file_url", retrievedImage.file_url.length > 0);
  TestValidator.predicate(
    "created_at is valid",
    retrievedImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedImage.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrievedImage.deleted_at, null);
}
