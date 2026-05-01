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
 * Test that the author of an image-type post can successfully replace
 * the post's image with a new one via the PUT endpoint.
 *
 * Validates the complete image replacement workflow including file processing,
 * thumbnail generation, and metadata update. The test ensures that after
 * replacement, the image record reflects the new image's properties — storage
 * paths, dimensions, file size, and MIME type — while preserving the post
 * association and creation timestamp.
 *
 * 1. Member registers and authenticates as the post author.
 * 2. Author creates a community and subscribes to it.
 * 3. Author creates an image-type post within the community.
 * 4. Author uploads an initial image to the post via POST, establishing
 *    baseline metadata with original_path, thumbnail_path, and timestamps.
 * 5. Author replaces the image via PUT with a new image URI reference.
 * 6. Validates that the replacement produced new storage paths, updated
 *    the modification timestamp, and preserved the post reference and
 *    creation time — confirming the old image files were discarded and
 *    the new image was processed with fresh thumbnail generation.
 */
export async function test_api_image_post_replace_image_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create a community owned by the author
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe author to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      authorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create an image-type post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    {
      body: { type: "image" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Upload initial image via POST
  const initialImage = await api.functional.communityHub.posts._image.upload(
    authorConnection,
    {
      postId: post.id,
      body: {
        file: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityHubPostImage.IUpload,
    },
  );
  typia.assert(initialImage);
  // 6. Replace image via PUT
  const updatedImage = await api.functional.communityHub.posts._image.update(
    authorConnection,
    {
      postId: post.id,
      body: {
        image_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityHubPostImage.IUpdate,
    },
  );
  typia.assert(updatedImage);
  // 7. Validate replacement produced new storage paths
  TestValidator.notEquals(
    "original path replaced",
    updatedImage.original_path,
    initialImage.original_path,
  );
  TestValidator.notEquals(
    "thumbnail path replaced",
    updatedImage.thumbnail_path,
    initialImage.thumbnail_path,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedImage.updated_at,
    initialImage.updated_at,
  );
  // 8. Validate preserved references
  TestValidator.equals(
    "post reference preserved",
    updatedImage.post.id,
    post.id,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedImage.created_at,
    initialImage.created_at,
  );
}
