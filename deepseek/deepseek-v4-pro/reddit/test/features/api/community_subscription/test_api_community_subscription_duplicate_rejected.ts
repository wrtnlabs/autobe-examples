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
 * Test that duplicate community subscription is rejected with 409 Conflict.
 *
 * Verifies the `@@unique([member_id, community_id])` constraint at the API
 * layer by first creating a member and community, subscribing successfully,
 * then attempting a second subscription to the same community. The second
 * attempt must be rejected with a 409 Conflict status, confirming the system
 * prevents duplicate subscriptions.
 *
 * 1. Register a new member and obtain authenticated connection.
 * 2. Create a community owned by the registered member.
 * 3. Subscribe to the community — first attempt succeeds.
 * 4. Subscribe to the same community again — second attempt rejected with 409.
 */
export async function test_api_community_subscription_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the community (first time — should succeed)
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Subscribe again to the same community (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate subscription rejected with 409",
    409,
    () =>
      api.functional.communityHub.member.communities.subscriptions.create(
        memberConnection,
        { communityName: community.name },
      ),
  );
}
