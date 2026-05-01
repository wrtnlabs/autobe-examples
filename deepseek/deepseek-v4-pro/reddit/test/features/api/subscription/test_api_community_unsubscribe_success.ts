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
 * Test successful community unsubscription workflow.
 *
 * Validates that a member who has previously subscribed to a community can
 * successfully unsubscribe. The test verifies that the subscriber count is
 * correctly incremented upon subscription and that the unsubscribe operation
 * completes without error, returning 204 No Content. The member's connection
 * is isolated from the base connection for proper authentication tracking.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Create a community owned by the authenticated member.
 * 3. Verify initial subscriber count is zero.
 * 4. Subscribe the member to the community via the subscriptions endpoint.
 * 5. Verify subscriber count incremented to 1 after subscription.
 * 6. Unsubscribe by calling the erase endpoint with the community name.
 * 7. Confirm the operation succeeds with no error (204 No Content).
 */
export async function test_api_community_unsubscribe_success(
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
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscriber count after subscribing",
    subscription.community.subscriber_count,
    1,
  );
  // 4. Unsubscribe from the community
  await api.functional.communityHub.member.communities.subscriptions.erase(
    memberConnection,
    { communityName: community.name },
  );
  // Returns 204 No Content - success is implicit (no error thrown)
}
