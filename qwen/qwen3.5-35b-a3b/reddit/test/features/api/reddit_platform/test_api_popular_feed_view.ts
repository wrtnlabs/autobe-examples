import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeed";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Primary success path - test different sort types
  const sortTypes = [
    "HOT" as const,
    "NEW" as const,
    "TOP" as const,
    "CONTROVERSIAL" as const,
  ];
  for (const sortType of sortTypes) {
    const output: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.feeds.popular.index(connection, {
        body: {
          feedType: "POPULAR",
          sortType,
        } satisfies IRedditPlatformPostFeed.IRequest,
      });
    typia.assert(output);
    TestValidator.equals(
      "pagination exists",
      output.pagination.current >= 0,
      true,
    );
    TestValidator.equals(
      "pagination limit exists",
      output.pagination.limit >= 0,
      true,
    );
    TestValidator.equals(
      "pagination records exists",
      output.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      "pagination pages exists",
      output.pagination.pages >= 0,
      true,
    );
    TestValidator.predicate("data is array", () => Array.isArray(output.data));
    // Validate post summary structure if posts exist
    for (const post of output.data) {
      typia.assert(post);
      TestValidator.equals(
        "post id is valid uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          post.id,
        ),
        true,
      );
      TestValidator.equals(
        "post title is string",
        typeof post.title === "string",
        true,
      );
      TestValidator.equals(
        "post post_type is string",
        typeof post.post_type === "string",
        true,
      );
      TestValidator.equals(
        "post vote_score is number",
        typeof post.vote_score === "number",
        true,
      );
      TestValidator.equals(
        "post comment_count is number",
        typeof post.comment_count === "number",
        true,
      );
      TestValidator.equals(
        "post author exists",
        post.author !== undefined,
        true,
      );
      TestValidator.equals(
        "post community exists",
        post.community !== undefined,
        true,
      );
      TestValidator.equals(
        "post created_at is string",
        typeof post.created_at === "string",
        true,
      );
      TestValidator.predicate(
        "post deleted_at is null or string",
        () => post.deleted_at === null || typeof post.deleted_at === "string",
      );
    }
  }
  // 2. Test with pagination parameters
  const outputWithPagination: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPostFeed.IRequest,
    });
  typia.assert(outputWithPagination);
  TestValidator.equals(
    "pagination current is 1",
    outputWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    outputWithPagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages is positive",
    outputWithPagination.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    outputWithPagination.pagination.records >= 0,
    true,
  );
  // 3. Test time range filter with TOP sort
  const timeRanges = [
    "TODAY" as const,
    "WEEK" as const,
    "MONTH" as const,
    "YEAR" as const,
    "ALL" as const,
  ];
  for (const timeRange of timeRanges) {
    const outputWithTimeRange: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.feeds.popular.index(connection, {
        body: {
          feedType: "POPULAR",
          sortType: "TOP",
          timeRange,
        } satisfies IRedditPlatformPostFeed.IRequest,
      });
    typia.assert(outputWithTimeRange);
    TestValidator.equals(
      `time range ${timeRange} pagination valid`,
      outputWithTimeRange.pagination.current >= 0,
      true,
    );
    TestValidator.equals(
      `time range ${timeRange} limit valid`,
      outputWithTimeRange.pagination.limit >= 0,
      true,
    );
    // Validate posts are within time range for TOP sort
    for (const post of outputWithTimeRange.data) {
      typia.assert(post);
      const postDate = new Date(post.created_at);
      const now = new Date();
      switch (timeRange) {
        case "TODAY": {
          const oneDayMs = 24 * 60 * 60 * 1000;
          TestValidator.predicate(
            `post ${post.id} within TODAY range`,
            () => now.getTime() - postDate.getTime() < oneDayMs,
          );
          break;
        }
        case "WEEK": {
          const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
          TestValidator.predicate(
            `post ${post.id} within WEEK range`,
            () => now.getTime() - postDate.getTime() < oneWeekMs,
          );
          break;
        }
        case "MONTH": {
          const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
          TestValidator.predicate(
            `post ${post.id} within MONTH range`,
            () => now.getTime() - postDate.getTime() < oneMonthMs,
          );
          break;
        }
        case "YEAR": {
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          TestValidator.predicate(
            `post ${post.id} within YEAR range`,
            () => now.getTime() - postDate.getTime() < oneYearMs,
          );
          break;
        }
        case "ALL": {
          // ALL should include all posts regardless of age
          TestValidator.equals(
            `post ${post.id} exists in ALL range`,
            post.id !== undefined,
            true,
          );
          break;
        }
      }
    }
  }
  // 4. Test vote score validation - negative scores for controversial posts
  const controversialOutput: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        feedType: "POPULAR",
        sortType: "CONTROVERSIAL",
      } satisfies IRedditPlatformPostFeed.IRequest,
    });
  typia.assert(controversialOutput);
  for (const post of controversialOutput.data) {
    typia.assert(post);
    TestValidator.equals(
      "vote_score is int32",
      Number.isInteger(post.vote_score),
      true,
    );
    // Controversial posts may have negative, zero, or positive scores (near zero is controversial)
    TestValidator.predicate(
      "vote_score can be negative for controversial",
      () => post.vote_score >= -1000 && post.vote_score <= 1000,
    );
  }
  // 5. Test author and community data structure
  for (const post of outputWithPagination.data) {
    typia.assert(post);
    if (post.author) {
      typia.assert(post.author);
      TestValidator.equals(
        "author username exists",
        typeof post.author.username === "string",
        true,
      );
      TestValidator.equals(
        "author displayName exists",
        typeof post.author.displayName === "string",
        true,
      );
      TestValidator.equals(
        "author karmaScore is number",
        typeof post.author.karmaScore === "number",
        true,
      );
      TestValidator.equals(
        "author createdAt is string",
        typeof post.author.createdAt === "string",
        true,
      );
      TestValidator.equals(
        "author subscriptionCount is number",
        typeof post.author.subscriptionCount === "number",
        true,
      );
    }
    if (post.community) {
      typia.assert(post.community);
      TestValidator.equals(
        "community name exists",
        typeof post.community.name === "string",
        true,
      );
      TestValidator.equals(
        "community subscriber_count is number",
        typeof post.community.subscriber_count === "number",
        true,
      );
      TestValidator.equals(
        "community created_at is string",
        typeof post.community.created_at === "string",
        true,
      );
    }
  }
}
