import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_posts_retrieval_with_top_sorting_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test different time filters with top sorting
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  for (const timeFilter of timeFilters) {
    const output: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.communities.posts.index(connection, {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          sort_by: "top",
          time_filter: timeFilter,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(output);
    // Verify pagination structure
    TestValidator.equals(
      "pagination records is non-negative",
      output.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      "pagination pages is non-negative",
      output.pagination.pages >= 0,
      true,
    );
    // Verify data array exists and has correct structure
    TestValidator.predicate("data array exists", Array.isArray(output.data));
  }
  // Test that time_filter can be null when sort_by is 'top' (API may handle this)
  const outputWithNoTimeFilter: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.communities.posts.index(connection, {
      communityId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sort_by: "top",
        time_filter: null,
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(outputWithNoTimeFilter);
  // Test different sort options
  const sortOptions: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sortBy of sortOptions) {
    const output: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.communities.posts.index(connection, {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          sort_by: sortBy,
          time_filter: sortBy === "top" ? "all_time" : undefined,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(output);
  }
}
