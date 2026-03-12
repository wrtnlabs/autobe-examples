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
 * Test that images from public posts are accessible without authentication.
 *
 * This test validates the public accessibility of post images by:
 * 1. Setting up a public community with an image-type post (authenticated)
 * 2. Uploading an image to the post (authenticated)
 * 3. Accessing the image without any authentication headers (unauthenticated)
 * 4. Verifying the complete image metadata is returned successfully
 */
export async function test_api_post_image_access_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Setup Phase: Authenticate as member to create resources
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Create a public community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create an image-type post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "image",
        communityId: community.id,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // Upload an image to the post
  const image = await generate_random_reddit_clone_member_posts_images_create(
    memberConnection,
    {
      body: {} satisfies IRedditClonePostImage.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(image);
  // Test Execution: Access image WITHOUT authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Retrieve the image without any authentication headers
  const retrievedImage = await api.functional.redditClone.posts.images.at(
    unauthenticatedConnection,
    {
      postId: post.id,
      imageId: image.id,
    },
  );
  typia.assert(retrievedImage);
  // Validate image metadata
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals("post id matches", retrievedImage.post.id, post.id);
  TestValidator.predicate(
    "file_url exists",
    retrievedImage.file_url.length > 0,
  );
  TestValidator.predicate("sequence is positive", retrievedImage.sequence >= 1);
  TestValidator.predicate(
    "created_at exists",
    retrievedImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedImage.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrievedImage.deleted_at, null);
}
