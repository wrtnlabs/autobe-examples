import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
 * Test idempotent behavior of community unsubscribe operation.
 *
 * Verifies that the unsubscribe endpoint correctly handles the case where a
 * member attempts to unsubscribe from a community they are not currently
 * subscribed to. The operation should succeed without error and return 204 No
 * Content, treating the already-unsubscribed state as a valid successful
 * outcome.
 *
 * 1. A new member registers and authenticates via the join endpoint.
 * 2. The member creates a new community, becoming its owner but not an
 *    automatic subscriber per the platform's design.
 * 3. The member attempts to unsubscribe from the community they just created.
 * 4. The unsubscribe succeeds silently (204 No Content), confirming idempotent
 *    behavior for non-subscribed members.
 */
export async function test_api_community_unsubscribe_idempotent(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (owner is NOT automatically subscribed)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Unsubscribe from the community (member is not subscribed — idempotent)
  await api.functional.communityHub.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityName: community.name,
    },
  );
}
