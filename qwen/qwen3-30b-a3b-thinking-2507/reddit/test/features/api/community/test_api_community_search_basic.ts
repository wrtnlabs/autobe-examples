import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Search with minimum subscriber count of 10
  const results = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        minSubscriberCount: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(results);
  // Verify all returned communities have at least 10 subscribers
  for (const community of results.data) {
    TestValidator.equals(
      "community should have at least 10 subscribers",
      community.subscriber_count >= 10,
      true,
    );
  }
  // Verify results are sorted by subscriber count descending (default)
  const sortedResults = [...results.data].sort(
    (a, b) => b.subscriber_count - a.subscriber_count,
  );
  for (let i = 0; i < results.data.length; i++) {
    TestValidator.equals(
      "results sorted by subscriber count descending",
      results.data[i].subscriber_count,
      sortedResults[i].subscriber_count,
    );
  }
  // Verify communities with less than 10 subscribers are not returned
  const communitiesWithLessThan10 = results.data.filter(
    (c) => c.subscriber_count < 10,
  );
  TestValidator.equals(
    "no communities with less than 10 subscribers should be returned",
    communitiesWithLessThan10.length,
    0,
  );
}
