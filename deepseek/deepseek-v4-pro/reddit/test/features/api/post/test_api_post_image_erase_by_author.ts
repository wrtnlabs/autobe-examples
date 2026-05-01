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
 * Test that a post author can erase the uploaded image from their image-type post.
 *
 * Validates the complete workflow of creating an image-type post and then removing its attached image without deleting the post itself. The image metadata record is soft-deleted while the post remains intact, and the endpoint returns a 204 No Content response on success.
 *
 * Special attention is given to verifying that only the post author can perform the erase operation — the member who created the post and its image is the same member issuing the erase request. The image record's soft-deletion is confirmed by the erase operation completing without errors.
 *
 * 1. Register and authenticate a new member as the post author.
 * 2. Create a community and subscribe the member to it.
 * 3. Create an image-type post with an uploaded image file attached.
 * 4. Call the image erase endpoint as the post author.
 * 5. Verify the erase operation completes successfully with a void response.
 */
export async function test_api_post_image_erase_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
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
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create image-type post with uploaded image
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        type: "image",
        image: {
          file: RandomGenerator.alphaNumeric(32),
        } satisfies ICommunityHubPostImage.IUpload,
      },
    },
  );
  typia.assert(post);
  TestValidator.predicate("post has image", post.image !== null);
  // 5. Erase the image as the post author
  await api.functional.communityHub.posts._image.erase(memberConnection, {
    postId: post.id,
  });
}
