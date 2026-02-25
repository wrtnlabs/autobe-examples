import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that retrieving a deleted post returns 404 POST_NOT_FOUND error.
 *
 * Setup flow:
 * 1. Create a member account via join
 * 2. Create a community (creator is auto-subscribed as owner)
 * 3. Create a TEXT post
 * 4. Delete the post (soft delete)
 *
 * Then call GET /community/posts/{postId} with the deleted post's ID.
 * Validate the response returns HTTP 404 status with POST_NOT_FOUND error.
 * This verifies soft-delete behavior - deleted posts are not retrievable.
 */
export async function test_api_post_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community (creator is auto-subscribed as owner)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a TEXT post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: { post_type: "TEXT" },
    },
  );
  typia.assert(post);
  // 4. Delete the post (soft delete)
  await api.functional.community.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 5. Attempt to retrieve the deleted post - should return 404 NOT_FOUND
  await TestValidator.httpError(
    "retrieving deleted post should return 404",
    404,
    async () => {
      await api.functional.community.posts.at(memberConnection, {
        postId: post.id,
      });
    },
  );
}
