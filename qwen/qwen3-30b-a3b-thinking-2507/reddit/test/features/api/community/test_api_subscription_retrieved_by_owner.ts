import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_subscription_retrieved_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access subscription details
  const memberConnection: api.IConnection = { host: connection.host };
  const authed = await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create community to reference in subscription
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 3. Create subscription to the community
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve subscription and validate
  const retrievedSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      memberConnection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // Validate subscription details
  TestValidator.equals(
    "community reference matches",
    retrievedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "active status (deleted_at is null)",
    retrievedSubscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "created_at is string",
    typeof retrievedSubscription.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is string",
    typeof retrievedSubscription.updated_at,
    "string",
  );
}
