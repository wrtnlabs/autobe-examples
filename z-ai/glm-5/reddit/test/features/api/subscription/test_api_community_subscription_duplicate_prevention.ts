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

/**
 * Test duplicate subscription prevention.
 *
 * This test validates that the subscription endpoint properly prevents
 * duplicate subscriptions to the same community by the same member.
 *
 * Steps:
 * 1. Register a new member account
 * 2. Create a new community with unique name and valid description
 * 3. First subscription call: Subscribe to the community successfully
 * 4. Second subscription call: Attempt to subscribe to the same community again
 * 5. Verify the API returns 409 Conflict error
 *
 * Business rules validated:
 * - Unique constraint on (member, community) pair is enforced
 * - Duplicate subscription attempts return 409 Conflict status code
 */
export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community with unique name and valid description
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. First subscription call: Subscribe to the community successfully
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Validate the subscription data
  TestValidator.equals(
    "subscription member id",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community id",
    subscription.community.id,
    community.id,
  );
  // 4. Second subscription call: Attempt to subscribe to the same community again
  // This should return 409 Conflict error
  await TestValidator.httpError(
    "duplicate subscription should return 409 Conflict",
    409,
    async () => {
      await api.functional.community.member.communities.subscriptions.create(
        memberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
}
