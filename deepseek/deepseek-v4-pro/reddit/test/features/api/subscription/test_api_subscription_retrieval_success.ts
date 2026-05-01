import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test that an authenticated member can retrieve their own subscription
 * record by UUID within the correct community namespace.
 *
 * Verifies the full subscription retrieval flow: a member creates a
 * community, subscribes to it, then fetches the subscription record by
 * its ID. The response must include the complete subscription with id,
 * member summary, community summary, created_at, and updated_at.
 *
 * Special attention is given to verifying that the member field matches
 * the authenticated user and that the community field matches the
 * created community, confirming correct scoping and ownership.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Member creates a new community via generate utility.
 * 3. Member subscribes to the newly created community.
 * 4. Member retrieves the subscription by its subscription ID within
 *    the community namespace.
 * 5. Validates subscription id matches, member identity, and community
 *    identity.
 */
export async function test_api_subscription_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
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
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription by ID
  const retrieved =
    await api.functional.communityHub.member.communities.subscriptions.at(
      memberConnection,
      {
        communityName: community.name,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate business logic
  TestValidator.equals(
    "subscription id matches",
    retrieved.id,
    subscription.id,
  );
  TestValidator.equals(
    "member matches authenticated user",
    retrieved.member.id,
    member.id,
  );
  TestValidator.equals(
    "community matches created community",
    retrieved.community.id,
    community.id,
  );
}
