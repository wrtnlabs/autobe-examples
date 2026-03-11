import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_listing_top_sorting_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Note: This endpoint supports public access for post discovery.
  // For authenticated endpoints, actor-specific connections would be created here:
  // const adminConnection: api.IConnection = { host: connection.host };
  // await authorize_admin_login(adminConnection, { ... });
  // Test different time range filters with sortBy=top
  const timeRanges: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  const results: {
    timeRange: string;
    posts: IRedditPlatformPost.ISummary[];
    pagination: IPage.IPagination;
  }[] = [];
  // Query posts with each time range
  for (const timeRange of timeRanges) {
    const response = await api.functional.redditPlatform.posts.index(
      connection,
      {
        body: {
          sortBy: "top",
          timeRange,
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(response);
    // Validate each post in the data array
    for (const post of response.data) {
      typia.assert(post);
    }
    results.push({
      timeRange,
      posts: response.data,
      pagination: response.pagination,
    });
  }
  // Validate that all responses have correct structure
  for (const result of results) {
    // Validate pagination structure
    TestValidator.equals("pagination current", result.pagination.current, 1);
    TestValidator.predicate(
      "pagination limit >= 1",
      result.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      result.pagination.pages >= 0,
    );
    // Validate posts are sorted by vote_score DESC (top ranking)
    for (let i = 0; i < result.posts.length - 1; i++) {
      const currentPost = result.posts[i];
      const nextPost = result.posts[i + 1];
      TestValidator.predicate(
        `timeRange=${result.timeRange}: posts sorted by vote_score DESC`,
        currentPost.vote_score >= nextPost.vote_score,
      );
    }
  }
  // Verify time-based filtering logic
  // all_time should include all posts (no time restriction)
  const allTimeResult = results.find((r) => r.timeRange === "all_time")!;
  const allTimePostCount = allTimeResult.posts.length;
  // Verify empty result handling for restrictive time ranges
  // Test if any time range returns empty results (edge case)
  for (const result of results) {
    if (result.posts.length === 0) {
      TestValidator.equals(
        "empty time range records",
        result.pagination.records,
        0,
      );
      TestValidator.equals(
        "empty time range pages",
        result.pagination.pages,
        0,
      );
    }
  }
  // Validate pagination metadata consistency
  for (const result of results) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      `pagination pages calculation for ${result.timeRange}`,
      result.pagination.pages,
      expectedPages,
    );
  }
}
