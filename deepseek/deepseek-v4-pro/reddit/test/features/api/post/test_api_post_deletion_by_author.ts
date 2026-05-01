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
 * Test that a member can soft-delete their own post.
 *
 * Validates the complete post deletion flow: member registration and
 * authentication, community creation, community subscription, text post
 * creation, and finally post deletion. The post is verified to be active
 * (deleted_at === null) before deletion, then the erase endpoint is called.
 *
 * Since the erase endpoint returns void, a successful non-throwing call
 * confirms the deletion was accepted. The post is soft-deleted — the record
 * persists with deleted_at set but becomes inaccessible through normal
 * feed and detail endpoints.
 *
 * 1. Member joins and authenticates with random credentials.
 * 2. Member creates a community with random name and description.
 * 3. Member subscribes to the newly created community.
 * 4. Member creates a text post within the subscribed community.
 * 5. Verifies the post starts active (deleted_at is null).
 * 6. Member deletes the post — success is confirmed when the call does not throw.
 */
export async function test_api_post_deletion_by_author(
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
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Verify post is active before deletion
  TestValidator.equals("post is active before deletion", post.deleted_at, null);
  // 6. Delete the post — success is confirmed by non-throwing call
  await api.functional.communityHub.posts.erase(memberConnection, {
    postId: post.id,
  });
}
