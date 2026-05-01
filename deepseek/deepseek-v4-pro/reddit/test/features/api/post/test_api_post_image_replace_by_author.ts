import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that the post author can replace the image on their own image-type post.
 *
 * Validates the image replacement workflow where the original post author uploads
 * a new image to an existing image-type post, replacing the original. The test
 * confirms that the response contains updated image metadata reflecting the
 * replacement file (original_path, thumbnail_path, byte_size, width, height,
 * mime_type) and that the updated_at timestamp advances while created_at is
 * preserved. The image record identity is maintained across the replacement via
 * upsert semantics, and the post summary reference remains correct.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates an image-type post with an initial image upload.
 * 4. Member calls the image replacement endpoint with a new image file.
 * 5. Validates the response: same image record id, updated metadata fields,
 *    advanced updated_at, preserved created_at, null deleted_at, and correct
 *    post summary reference.
 */
export async function test_api_post_image_replace_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create an image-type post with an initial image
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "image",
        image: { file: "initial-image-binary-data" },
      },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  typia.assertGuard(post.image!);
  const initialImage = post.image;
  // 5. Replace the image using the target endpoint
  const newImage = await api.functional.communityHub.posts._image.upload(
    memberConnection,
    {
      postId: post.id,
      body: {
        file: "replacement-image-binary-data",
      } satisfies ICommunityHubPostImage.IUpload,
    },
  );
  typia.assert(newImage);
  // 6. Validate the response
  TestValidator.equals(
    "image record id preserved",
    newImage.id,
    initialImage.id,
  );
  TestValidator.notEquals(
    "updated_at reflects replacement",
    newImage.updated_at,
    initialImage.updated_at,
  );
  TestValidator.equals(
    "created_at preserved after replacement",
    newImage.created_at,
    initialImage.created_at,
  );
  TestValidator.equals(
    "deleted_at is null after replacement",
    newImage.deleted_at,
    null,
  );
  // Verify image metadata reflects the replacement file
  TestValidator.notEquals(
    "original_path changed",
    newImage.original_path,
    initialImage.original_path,
  );
  TestValidator.notEquals(
    "thumbnail_path changed",
    newImage.thumbnail_path,
    initialImage.thumbnail_path,
  );
  TestValidator.predicate("byte_size is non-negative", newImage.byte_size >= 0);
  TestValidator.predicate("width is non-negative", newImage.width >= 0);
  TestValidator.predicate("height is non-negative", newImage.height >= 0);
  TestValidator.predicate(
    "mime_type is a non-empty string",
    newImage.mime_type.length > 0,
  );
  // Validate the post summary reference is correctly included
  TestValidator.equals("post reference matches", newImage.post.id, post.id);
  TestValidator.equals("post title matches", newImage.post.title, post.title);
}
