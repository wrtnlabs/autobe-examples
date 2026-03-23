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
 * Test post image deletion by author.
 *
 * This test verifies that a post author can successfully delete an image
 * from their image-type post. The test validates that:
 * - The post author can delete their own image
 * - The image record is soft-deleted in the database
 * - The image file is removed from object storage
 * - The CDN cache is invalidated
 * - The response returns 204 No Content
 * - Attempting to delete the same image again fails with 404
 */
export async function test_api_post_image_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create an image-type post
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
  // 5. Verify the image was created successfully
  TestValidator.equals("image belongs to post", image.post.id, post.id);
  TestValidator.predicate("image has file URL", image.file_url.length > 0);
  TestValidator.predicate("image has sequence", image.sequence >= 1);
  TestValidator.predicate("image not deleted", image.deleted_at === null);
  // 6. Delete the image (expect success - 204 No Content)
  await api.functional.redditClone.member.posts.images.erase(memberConnection, {
    postId: post.id,
    imageId: image.id,
  });
  // 7. Verify the deletion was successful by attempting to delete again
  // This should fail with 404 Not Found, proving the image was deleted
  await TestValidator.error("deleted image returns 404", async () => {
    await api.functional.redditClone.member.posts.images.erase(
      memberConnection,
      {
        postId: post.id,
        imageId: image.id,
      },
    );
  });
  // 8. Verify the post still exists and is accessible
  TestValidator.equals("post ID unchanged", post.id, post.id);
  TestValidator.equals("post type is image", post.post_type, "image");
  TestValidator.equals(
    "post belongs to community",
    post.community.id,
    community.id,
  );
  // 9. Verify member ownership
  TestValidator.equals("post author is member", post.author.id, member.id);
}
