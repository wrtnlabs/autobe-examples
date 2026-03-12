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
 * Test the primary success path for uploading an image to an image-type post.
 *
 * This test validates the complete workflow:
 * 1. Member registration and authentication
 * 2. Community creation
 * 3. Image-type post creation
 * 4. Image upload to the post
 * 5. Verification of image record creation with correct metadata
 */
export async function test_api_post_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
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
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(image);
  // 5. Validate image record
  TestValidator.predicate("file_url is not empty", image.file_url.length > 0);
  TestValidator.equals("sequence is 1 for first image", image.sequence, 1);
  TestValidator.equals("post matches", image.post.id, post.id);
  TestValidator.predicate("created_at is valid", image.created_at.length > 0);
  TestValidator.predicate("updated_at is valid", image.updated_at.length > 0);
  TestValidator.equals(
    "deleted_at is null for active image",
    image.deleted_at,
    null,
  );
}
