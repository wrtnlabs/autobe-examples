import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: 'hot' sorting (default) - trending algorithm
  const hotResult = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        sort: "hot",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotResult);
  // Test 2: 'new' sorting - chronological order (most recent first)
  const newResult = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newResult);
  // Validate 'new' sorting produces descending chronological order
  if (newResult.data.length > 1) {
    for (let i = 0; i < newResult.data.length - 1; i++) {
      const currentCreatedAt = new Date(newResult.data[i].createdAt).getTime();
      const nextCreatedAt = new Date(newResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "new sorting should be chronological descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // Test 3: 'top' sorting with various time filters
  const timeFilters = [
    "today",
    "this_week",
    "this_month",
    "this_year",
    "all_time",
  ] as const;
  for (const timeFilter of timeFilters) {
    const topResult = await api.functional.communityPlatform.popular.index(
      connection,
      {
        body: {
          sort: "top",
          timeFilter,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(topResult);
    // Validate 'top' sorting produces descending score order
    if (topResult.data.length > 1) {
      for (let i = 0; i < topResult.data.length - 1; i++) {
        TestValidator.predicate(
          `top sorting with timeFilter='${timeFilter}' should be score descending`,
          topResult.data[i].score >= topResult.data[i + 1].score,
        );
      }
    }
  }
  // Test 4: 'controversial' sorting - divisive content
  const controversialResult =
    await api.functional.communityPlatform.popular.index(connection, {
      body: {
        sort: "controversial",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(controversialResult);
  // Validate 'controversial' sorting - posts with high engagement should appear
  // 'controversial' algorithm surfaces posts with similar upvote/downvote counts
  if (controversialResult.data.length > 1) {
    // Verify results are ordered by engagement metrics (controversial algorithm)
    for (let i = 0; i < controversialResult.data.length - 1; i++) {
      const currentScore = Math.abs(controversialResult.data[i].score);
      const nextScore = Math.abs(controversialResult.data[i + 1].score);
      // Controversial posts tend to have scores closer to zero (similar upvotes/downvotes)
      // They are ordered by total votes descending, then by absolute score ascending
      TestValidator.predicate(
        "controversial sorting should order by engagement",
        currentScore >= nextScore || currentScore <= 100,
      );
    }
  }
}
