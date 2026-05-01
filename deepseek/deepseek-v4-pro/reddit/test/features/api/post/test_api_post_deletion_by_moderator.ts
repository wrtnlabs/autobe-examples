import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
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
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a community moderator can delete a post authored by a non-owner member.
 *
 * Validates the core business rule that appointed community moderators hold content moderation privileges scoped to their community — they may delete any post within that community except those authored by the community owner. This test specifically exercises the positive case: the post is created by an ordinary member, not the owner, so deletion must succeed.
 *
 * The test constructs three distinct actors — owner, moderator, and post author — each with isolated connections to ensure clean authorization boundaries. The moderator is appointed by the owner after the moderator's account is registered, establishing the governance relationship before the post content exists.
 *
 * 1. Owner registers and creates a community.
 * 2. Second member registers (future moderator).
 * 3. Owner appoints the second member as moderator of the community.
 * 4. Third member registers, subscribes to the community, and creates a text post.
 * 5. Moderator deletes the post — expected to succeed without error.
 */
export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Register the member who will become moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 3. Owner appoints the second member as moderator
  const moderatorRole =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderatorAuth.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorRole);
  // 4. Register third member (post author, not the owner)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // 5. Post author subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      authorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 6. Post author creates a post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 7. Moderator deletes the post (not authored by the owner — must succeed)
  await api.functional.communityHub.posts.erase(moderatorConnection, {
    postId: post.id,
  });
}
