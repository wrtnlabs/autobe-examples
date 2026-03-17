import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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

export async function test_api_community_list_browsing_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member and create authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create 3 distinct communities
  // Community 1: all fields filled (name, description, iconUrl)
  const community1 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-all-fields-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url:
          `https://example.com/icons/${RandomGenerator.alphaNumeric(8)}.png` as string &
            tags.Format<"url">,
      },
    },
  );
  typia.assert(community1);
  // Community 2: name and description only (no icon)
  const community2 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-with-desc-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      },
    },
  );
  typia.assert(community2);
  // Community 3: name only (no description, no icon)
  const community3 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-name-only-${RandomGenerator.alphaNumeric(8)}`,
        description: null,
        icon_url: null,
      },
    },
  );
  typia.assert(community3);
  // Step 3: Subscribe to Community 1 to generate non-zero subscriber count
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Step 5: Call PATCH /community/communities without authentication
  const result = await api.functional.community.communities.index(
    unauthenticatedConnection,
    {
      body: {} satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Step 6: Verify pagination metadata
  TestValidator.predicate(
    "pagination.current >= 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 1",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records >= 3",
    result.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    result.pagination.pages >= 1,
  );
  // Step 7: Verify data array is present
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Step 8: Find the subscribed community (community1) and verify subscriberCount >= 1
  const foundCommunity1 = result.data.find((c) => c.id === community1.id);
  TestValidator.predicate(
    "subscribed community found in listing",
    foundCommunity1 !== undefined,
  );
  if (foundCommunity1 !== undefined) {
    TestValidator.predicate(
      "subscribed community has subscriberCount >= 1",
      foundCommunity1.subscriberCount >= 1,
    );
  }
  // Step 9: Find communities without subscriptions and verify subscriberCount === 0
  const foundCommunity2 = result.data.find((c) => c.id === community2.id);
  TestValidator.predicate(
    "community2 found in listing",
    foundCommunity2 !== undefined,
  );
  if (foundCommunity2 !== undefined) {
    TestValidator.equals(
      "community2 has subscriberCount 0",
      foundCommunity2.subscriberCount,
      0,
    );
  }
  const foundCommunity3 = result.data.find((c) => c.id === community3.id);
  TestValidator.predicate(
    "community3 found in listing",
    foundCommunity3 !== undefined,
  );
  if (foundCommunity3 !== undefined) {
    TestValidator.equals(
      "community3 has subscriberCount 0",
      foundCommunity3.subscriberCount,
      0,
    );
  }
  // Step 10: Verify default sort order is newest-first (createdAt DESC)
  // Find the indices of our 3 created communities in the result
  const allIds = result.data.map((c) => c.id);
  const idx1 = allIds.indexOf(community1.id);
  const idx2 = allIds.indexOf(community2.id);
  const idx3 = allIds.indexOf(community3.id);
  // community3 was created last → should appear before community2 → before community1
  if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1) {
    TestValidator.predicate(
      "newest community (community3) appears before community2 in DESC order",
      idx3 < idx2,
    );
    TestValidator.predicate(
      "community2 appears before community1 in DESC order",
      idx2 < idx1,
    );
  }
}
