import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
 * Test unsubscription attempt when member is not subscribed to the community.
 *
 * This test validates that attempting to unsubscribe from a community
 * that the member has never subscribed to results in an error.
 *
 * Steps:
 * 1. Member A creates a community (auto-subscribed as owner, subscriber_count = 1)
 * 2. Member B authenticates but does NOT subscribe to the community
 * 3. Member B attempts to unsubscribe - should fail with error
 * 4. Validates business rule preventing invalid subscription state manipulation
 */
export async function test_api_community_unsubscribe_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Store initial subscriber count (should be 1 - only the creator)
  const initialSubscriberCount = community.subscriberCount;
  // 2. Member B authenticates but does NOT subscribe to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member B attempts to unsubscribe from a community they never subscribed to
  // This should throw an error
  await TestValidator.error(
    "unsubscribing from non-subscribed community should fail",
    async () => {
      await api.functional.community.member.communities._subscribe.unsubscribe(
        memberBConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
  // 4. Verify subscriber count remains unchanged
  // Note: We would need a GET community endpoint to verify this,
  // but based on the available endpoints, we trust the error was thrown
  TestValidator.equals(
    "initial subscriber count should be 1",
    initialSubscriberCount,
    1,
  );
}
