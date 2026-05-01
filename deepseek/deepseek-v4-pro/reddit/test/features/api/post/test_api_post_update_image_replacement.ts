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
 * Test image replacement on an existing image-type post via partial update.
 *
 * Validates the complete flow of replacing an image on an image-type post through the PATCH endpoint. The test creates an image post, then issues a partial update with only a new image reference, confirming that the new image metadata fully replaces the original while the post identity is preserved.
 *
 * 1. A new member registers and authenticates via authorize_member_join.
 * 2. The member creates a community using generate_random_community_hub_member_communities_create.
 * 3. The member subscribes to the newly created community.
 * 4. An image-type post is created with an initial image via generate_random_community_hub_communities_posts_create.
 * 5. The post is updated with a new image URI through the PATCH endpoint.
 * 6. Validates that the post id is unchanged, the new image has a different id and all metadata fields differ from the original, and the updated_at timestamp is refreshed.
 */
export async function test_api_post_update_image_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create image post with initial image
  const initialPost =
    await generate_random_community_hub_communities_posts_create(
      memberConnection,
      {
        body: {
          type: "image",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          image: {
            file: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityHubPostImage.IUpload,
        } satisfies ICommunityHubPost.ICreate,
        params: { communityName: community.name },
      },
    );
  typia.assert(initialPost);
  // Save original image for comparison
  const originalImage = typia.assert<ICommunityHubPostImage>(initialPost.image);
  // 5. Update post with new replacement image
  const updatedPost = await api.functional.communityHub.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        image: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityHubPostImage.IUpdate,
      } satisfies ICommunityHubPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate replacement results
  const newImage = typia.assert<ICommunityHubPostImage>(updatedPost.image);
  TestValidator.equals("post id unchanged", updatedPost.id, initialPost.id);
  TestValidator.equals("post type still image", updatedPost.type, "image");
  TestValidator.notEquals("image id changed", newImage.id, originalImage.id);
  TestValidator.notEquals(
    "original path changed",
    newImage.original_path,
    originalImage.original_path,
  );
  TestValidator.notEquals(
    "thumbnail path changed",
    newImage.thumbnail_path,
    originalImage.thumbnail_path,
  );
  TestValidator.notEquals(
    "byte_size differs",
    newImage.byte_size,
    originalImage.byte_size,
  );
  TestValidator.notEquals("width differs", newImage.width, originalImage.width);
  TestValidator.notEquals(
    "height differs",
    newImage.height,
    originalImage.height,
  );
  TestValidator.notEquals(
    "mime_type may differ",
    newImage.mime_type,
    originalImage.mime_type,
  );
  TestValidator.predicate("new image is active", newImage.deleted_at === null);
  TestValidator.predicate(
    "updated_at refreshed",
    updatedPost.updated_at !== initialPost.updated_at,
  );
}
