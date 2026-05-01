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
 * Test successful community subscription by an authenticated member.
 *
 * Validates the complete subscription flow: member registration, community creation, and subscribing to the community. Ensures the subscription response contains the correct member and community references and that the community's subscriber count is incremented accordingly.
 *
 * 1. Register a new member via authorize_member_join and obtain authentication.
 * 2. Create a community via generate_random_community_hub_member_communities_create — subscriber_count starts at 0.
 * 3. Subscribe to the community using the community's name as the path parameter.
 * 4. Validate the subscription record has correct member id, community id, community name, and that subscriber_count reflects the new subscription.
 */
export async function test_api_community_subscription_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
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
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription
  TestValidator.equals("member id matches", subscription.member.id, member.id);
  TestValidator.equals(
    "community id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscriber count incremented",
    subscription.community.subscriber_count,
    1,
  );
}
