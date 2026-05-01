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
 * Test that requesting the image of a soft-deleted post returns a 404 error.
 *
 * Validates that soft-deleted image-type posts have their associated images excluded from public retrieval. After creating an image post within a subscribed community and then soft-deleting it, the image endpoint must reject the request with a 404 status since the post is no longer considered active.
 *
 * 1. Register and authenticate a new member via the join utility.
 * 2. Create a community owned by the authenticated member.
 * 3. Subscribe the member to the community to enable posting.
 * 4. Create an image-type post with an uploaded image in the community.
 * 5. Soft-delete the post through the erase endpoint.
 * 6. Attempt to retrieve the image of the deleted post and confirm 404 rejection.
 */
export async function test_api_post_image_retrieve_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
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
  // 4. Create an image-type post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "image",
      },
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 5. Soft-delete the post
  await api.functional.communityHub.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 6. Attempt to retrieve the image of the deleted post
  await TestValidator.httpError(
    "image of soft-deleted post returns 404",
    404,
    async () => {
      await api.functional.communityHub.posts.image(memberConnection, {
        postId: post.id,
      });
    },
  );
}
