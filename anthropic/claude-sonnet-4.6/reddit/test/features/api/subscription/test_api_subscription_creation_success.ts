import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_subscription_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Create a community as member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register and authenticate member B (the subscriber)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 4: Member B subscribes to the community created by member A
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Validate subscription details
  // Subscription must be active (not deleted)
  TestValidator.equals(
    "subscription deleted_at is null (active)",
    subscription.deleted_at,
    null,
  );
  // The subscribed member must be member B
  TestValidator.equals(
    "subscription member id matches member B",
    subscription.member.id,
    memberB.id,
  );
  // The community in the subscription must be the created community
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );
  // Community name must be preserved
  TestValidator.equals(
    "subscription community name matches created community",
    subscription.community.name,
    community.name,
  );
  // Subscriber count must be at least 1 after subscription
  TestValidator.predicate(
    "community subscriber count is at least 1",
    subscription.community.subscriberCount >= 1,
  );
}
