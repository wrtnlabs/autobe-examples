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
 * Test duplicate subscription returns 409 CONFLICT error.
 *
 * Scenario:
 * 1. Register and authenticate a new member
 * 2. Create a new community (creator is auto-subscribed)
 * 3. Attempt to subscribe to the same community again
 * 4. Verify 409 CONFLICT error is returned
 */
export async function test_api_community_subscription_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community (creator is auto-subscribed automatically)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Verify initial subscriber count is 1 (the creator is auto-subscribed)
  TestValidator.equals(
    "initial subscriber count",
    community.subscriberCount,
    1,
  );
  // 3. Attempt to subscribe to the same community again
  // This should fail with 409 CONFLICT because the creator is already subscribed
  await TestValidator.httpError(
    "duplicate subscription should fail with 409 CONFLICT",
    409,
    async () => {
      await api.functional.community.member.communities.subscribe(
        memberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
}
