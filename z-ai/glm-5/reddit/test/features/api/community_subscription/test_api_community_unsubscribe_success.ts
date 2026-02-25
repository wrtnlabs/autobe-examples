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
 * Test successful community unsubscription flow.
 *
 * This test verifies that a member can successfully unsubscribe from a community:
 * 1. Member A creates a community (becomes auto-subscribed as owner)
 * 2. Member B joins the platform and subscribes to that community
 * 3. Member B unsubscribes from the community
 * 4. Verify the unsubscription succeeds (void response)
 */
export async function test_api_community_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates a community (auto-subscribed as owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 2. Member B joins and subscribes to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // Verify initial subscription state
  TestValidator.equals(
    "member B is subscriber",
    subscription.community.name,
    community.name,
  );
  // 3. Member B unsubscribes from the community
  await api.functional.community.member.communities._subscribe.unsubscribe(
    memberBConnection,
    { communityName: community.name },
  );
  // 4. Verify unsubscription - attempting to unsubscribe again should fail
  await TestValidator.error("unsubscribing twice should fail", async () => {
    await api.functional.community.member.communities._subscribe.unsubscribe(
      memberBConnection,
      { communityName: community.name },
    );
  });
}
