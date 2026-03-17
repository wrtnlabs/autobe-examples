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

export async function test_api_subscription_reactivation_after_unsubscribe(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community as Member A
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register and authenticate Member B (subscriber)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriber = await authorize_member_join(subscriberConnection, {});
  // 4. Member B subscribes to the community (main action under test)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      subscriberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Validate subscription business logic
  TestValidator.equals(
    "subscription member id matches member B",
    subscription.member.id,
    subscriber.id,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    subscription.deleted_at,
    null,
  );
  // 6. Attempt to subscribe again — expect a conflict (already subscribed)
  await TestValidator.error(
    "subscribing again to the same community should fail (409 conflict)",
    async () => {
      await api.functional.community.member.communities.subscriptions.create(
        subscriberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
