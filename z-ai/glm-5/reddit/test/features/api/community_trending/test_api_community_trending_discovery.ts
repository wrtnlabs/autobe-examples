import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityTrending } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityTrending";
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

export async function test_api_community_trending_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate to generate trending data
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities to generate trending data
  const community1 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community1);
  const community2 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community2);
  const community3 = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 7 }),
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community3);
  // 3. Create subscriptions to generate trending activity
  const subscription1 =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community1.name,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community2.name,
      },
    );
  typia.assert(subscription2);
  // 4. Call trending endpoint (publicly accessible without auth)
  const trending =
    await api.functional.community.communities.trending(connection);
  typia.assert(trending);
  // 5. Validate response structure
  TestValidator.predicate("data is array", Array.isArray(trending.data));
  TestValidator.predicate("max 5 items", trending.data.length <= 5);
  // 6. Validate each community summary has required fields
  await ArrayUtil.asyncForEach(trending.data, async (community) => {
    TestValidator.predicate("has id", typeof community.id === "string");
    TestValidator.predicate("has name", typeof community.name === "string");
    TestValidator.predicate(
      "has description",
      typeof community.description === "string",
    );
    TestValidator.predicate(
      "description max 100 chars",
      community.description.length <= 100,
    );
    TestValidator.predicate(
      "has subscriber_count",
      typeof community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "has created_at",
      typeof community.created_at === "string",
    );
    // icon_url can be null or string
    TestValidator.predicate(
      "icon_url is null or string",
      community.icon_url === null || typeof community.icon_url === "string",
    );
  });
  // 7. Verify our created communities appear in trending (they have subscription growth)
  const trendingNames = trending.data.map((c) => c.name);
  TestValidator.predicate(
    "created communities in trending",
    trendingNames.includes(community1.name) ||
      trendingNames.includes(community2.name),
  );
}
