import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
 * Test that an authenticated member who is NOT subscribed to a community is rejected when attempting to create a post, even if they are the community owner.
 *
 * Validates the business rule that an active subscription is mandatory for posting in a community, regardless of the member's role. The community owner is not automatically subscribed upon community creation, so ownership alone does not grant posting privileges.
 *
 * 1. Member joins the platform via registration and is authenticated.
 * 2. Member creates a new community, becoming its permanent owner but not automatically subscribed.
 * 3. Member attempts to create a text post in their own community without an active subscription.
 * 4. Validates the API rejects the request with an error, confirming the subscription requirement.
 */
export async function test_api_post_creation_without_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community — member becomes owner but is NOT auto-subscribed
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Attempt to create a post without subscription — expect rejection
  await TestValidator.error("subscription required for posting", async () => {
    await api.functional.communityHub.communities.posts.create(
      memberConnection,
      {
        communityName: community.name,
        body: {
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityHubPost.ICreate,
      },
    );
  });
}
