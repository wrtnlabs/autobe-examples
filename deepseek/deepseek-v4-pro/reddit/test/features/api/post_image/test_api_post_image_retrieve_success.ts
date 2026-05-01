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
 * Test successful retrieval of full-resolution image for an image-type post.
 *
 * Verifies that the original uploaded image for an image-type post can be
 * retrieved through the public GET endpoint. The test validates the complete
 * flow from member registration through post creation to image retrieval,
 * confirming that the image endpoint is accessible to unauthenticated guests
 * and serves image data without errors.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates an image-type post with a minimal valid PNG image.
 * 4. Validates the created post has type "image" with non-null image metadata.
 * 5. Requests the image via the public GET endpoint using an unauthenticated
 *    connection, verifying the endpoint completes without throwing errors.
 */
export async function test_api_post_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
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
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image-type post with a minimal valid PNG image
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "image",
        image: {
          file: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
      },
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // Validate post is image type with image metadata
  TestValidator.equals("post type is image", post.type, "image");
  TestValidator.predicate("post has image", post.image !== null);
  TestValidator.predicate(
    "image has mime type",
    post.image!.mime_type.length > 0,
  );
  TestValidator.predicate("image has width", post.image!.width >= 0);
  TestValidator.predicate("image has height", post.image!.height >= 0);
  TestValidator.predicate("image has byte size", post.image!.byte_size >= 0);
  // 5. Retrieve the image using an unauthenticated connection (guest access)
  await api.functional.communityHub.posts.image(connection, {
    postId: post.id,
  });
}
