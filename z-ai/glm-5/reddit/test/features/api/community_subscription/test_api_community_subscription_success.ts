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

export async function test_api_community_subscription_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community (creator is auto-subscribed, subscriber_count = 1)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Verify initial subscriber count is 1 (creator auto-subscribed)
  TestValidator.equals(
    "initial subscriber count",
    community.subscriberCount,
    1,
  );
  // Step 3: Create a new member who will subscribe
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriber = await authorize_member_join(subscriberConnection, {});
  typia.assert(subscriber);
  // Step 4: Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      subscriberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Step 5: Verify subscription response structure
  TestValidator.predicate("subscription ID is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subscription.id,
    ),
  );
  TestValidator.equals(
    "subscription member ID",
    subscription.member.id,
    subscriber.id,
  );
  TestValidator.equals(
    "subscription community ID",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community name",
    subscription.community.name,
    community.name,
  );
  TestValidator.predicate(
    "subscription created_at is valid ISO date",
    () => !isNaN(Date.parse(subscription.created_at)),
  );
  // Step 6: Verify subscriber_count was incremented to 2
  // Note: We need to fetch the community again to see updated subscriber_count
  // Since we don't have a GET community endpoint in the available APIs,
  // we verify through the subscription's community object
  TestValidator.equals(
    "subscriber count incremented",
    subscription.community.subscriber_count,
    2,
  );
}
