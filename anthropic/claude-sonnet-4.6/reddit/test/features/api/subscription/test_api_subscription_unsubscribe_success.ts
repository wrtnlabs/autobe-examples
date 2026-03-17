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

export async function test_api_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community using the authenticated member's session
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the authenticated member to the newly created community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Confirm active subscription: deleted_at must be null
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    subscription.deleted_at,
    null,
  );
  // Step 4: Unsubscribe the member from the community (primary test action)
  await api.functional.community.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 5: Verify idempotency is NOT guaranteed — second DELETE should fail
  await TestValidator.error(
    "second unsubscribe should fail (no active subscription)",
    async () => {
      await api.functional.community.member.communities.subscriptions.erase(
        memberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
