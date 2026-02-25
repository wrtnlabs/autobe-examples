import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
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
 * Test the 30-day time window filtering for new communities.
 *
 * This test verifies that:
 * 1. The GET /community/communities/new endpoint returns only communities
 *    created within the last 30 days
 * 2. Results are sorted by creation date in descending order (newest first)
 * 3. A newly created community appears in the results
 */
export async function test_api_community_new_communities_time_window_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community to verify it appears in new communities list
  const newCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(newCommunity);
  // 3. Fetch new communities list
  const result =
    await api.functional.community.communities._new.recent(connection);
  typia.assert(result);
  // 4. Verify the newly created community appears in results
  const foundNewCommunity = result.data.find(
    (community) => community.id === newCommunity.id,
  );
  TestValidator.predicate(
    "newly created community should appear in new communities list",
    foundNewCommunity !== undefined,
  );
  // 5. Verify all communities have created_at within 30-day window
  const currentTime = new Date();
  const thirtyDaysAgo = new Date(
    currentTime.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  for (const community of result.data) {
    const createdAt = new Date(community.created_at);
    TestValidator.predicate(
      `community ${community.name} should be created within 30 days`,
      createdAt >= thirtyDaysAgo && createdAt <= currentTime,
    );
  }
  // 6. Verify sorting is newest-first (descending by created_at)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentCreatedAt = new Date(result.data[i].created_at);
      const nextCreatedAt = new Date(result.data[i + 1].created_at);
      TestValidator.predicate(
        "communities should be sorted by created_at descending (newest first)",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
}
