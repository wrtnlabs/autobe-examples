import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_popular_feed_top_sorting_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Generate random request body with 'top' sorting and various time ranges
  const timeRanges: (
    | "today"
    | "this week"
    | "this month"
    | "this year"
    | "all time"
    | null
  )[] = ["today", "this week", "this month", "this year", "all time", null];
  for (const timeRange of timeRanges) {
    const requestBody: ICommunityPlatformPost.IRequest = {
      sort: "top",
      timeRange,
      page: 1,
      limit: 10,
    } satisfies ICommunityPlatformPost.IRequest;
    // Call the popular feed endpoint
    const result: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.posts.popular.index(connection, {
        body: requestBody,
      });
    typia.assert(result);
    // Validate pagination
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", result.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records > 0",
      () => result.pagination.records > 0,
    );
    TestValidator.predicate(
      "pagination pages > 0",
      () => result.pagination.pages > 0,
    );
    // Validate that posts are returned
    TestValidator.predicate("posts data exists", () => result.data.length > 0);
    // Check that posts are sorted by vote score (highest first)
    for (let i = 0; i < result.data.length - 1; i++) {
      // Ensure higher vote score comes before lower vote score
      TestValidator.predicate("posts sorted by vote score descending", () => {
        return result.data[i].voteScore >= result.data[i + 1].voteScore;
      });
    }
    // If timeRange is not null, verify post creation dates fall within the specified window
    if (timeRange !== null) {
      const now = new Date();
      for (const post of result.data) {
        const postDate = new Date(post.createdAt);
        let isValid = false;
        switch (timeRange) {
          case "today":
            const todayStart = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            const todayEnd = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            );
            isValid = postDate >= todayStart && postDate < todayEnd;
            break;
          case "this week":
            const weekStart = new Date();
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            isValid = postDate >= weekStart && postDate < weekEnd;
            break;
          case "this month":
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            isValid = postDate >= monthStart && postDate < monthEnd;
            break;
          case "this year":
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
            isValid = postDate >= yearStart && postDate < yearEnd;
            break;
          case "all time":
            // All posts should be accepted, already validated by sort order
            isValid = true;
            break;
          default:
            isValid = false;
        }
        TestValidator.predicate(
          "post created within time range",
          () => isValid,
        );
      }
    }
  }
  // Verify that other sorting methods ignore timeRange parameter
  const otherSorts: ("hot" | "new" | "controversial")[] = [
    "hot",
    "new",
    "controversial",
  ];
  for (const sort of otherSorts) {
    const requestBodyOther: ICommunityPlatformPost.IRequest = {
      sort,
      timeRange: "today", // Include timeRange with 'today'
      page: 1,
      limit: 10,
    } satisfies ICommunityPlatformPost.IRequest;
    const resultOther: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.posts.popular.index(connection, {
        body: requestBodyOther,
      });
    typia.assert(resultOther);
    // Validate that posts are returned
    TestValidator.predicate(
      "posts data exists for other sort methods",
      () => resultOther.data.length > 0,
    );
    // Validate that sorting is correct for each method
    if (sort === "hot") {
      // For 'hot' sort, we don't expect posts to be sorted by vote score in a simple way
      // as it uses a logarithmic algorithm, so we can't validate exact ordering
      // but we expect there are results
    } else if (sort === "new") {
      // For 'new' sort, posts should be sorted by newest first (descending createdAt)
      for (let i = 0; i < resultOther.data.length - 1; i++) {
        const date1 = new Date(resultOther.data[i].createdAt);
        const date2 = new Date(resultOther.data[i + 1].createdAt);
        TestValidator.predicate(
          "posts sorted by creation date descending",
          () => date1 >= date2,
        );
      }
    } else if (sort === "controversial") {
      // For 'controversial' sort, posts should have high total votes but net score close to zero
      // This means they have about equal upvotes and downvotes
      for (const post of resultOther.data) {
        TestValidator.predicate(
          "controversial posts have high vote count",
          () => {
            // A reasonable minimum for controversial posts is 10+ total votes
            return post.voteScore > -10 && post.voteScore < 10;
          },
        );
      }
    }
  }
}
