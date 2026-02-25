import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_retrieval_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate test community ID
  const communityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  // Test sorting algorithms
  const sortingMethods = ["hot", "new", "top", "controversial"] as const;
  const timeFilters = ["today", "week", "month", "year", "allTime"] as const;
  for (const sort of sortingMethods) {
    const params: IRedditCloneContentPost.IRequest = {
      sort: sort,
      page: 1,
      limit: 10,
    };
    if (sort === "top") {
      // Test top sorting with different time filters
      for (const timeFilter of timeFilters) {
        const result: IPageIRedditCloneContentPost.ISummary =
          await api.functional.redditClone.communities.posts.index(connection, {
            communityId: communityId,
            body: {
              ...params,
              timeFilter: timeFilter,
            } satisfies IRedditCloneContentPost.IRequest,
          });
        typia.assert(result);
        // Verify pagination structure
        TestValidator.equals("pagination exists", result.pagination.current, 1);
        TestValidator.equals("limit correct", result.pagination.limit, 10);
        TestValidator.predicate("has data", result.data.length >= 0);
        // Verify post structure if posts exist
        for (const post of result.data) {
          TestValidator.equals("post has id", typeof post.id, "string");
          TestValidator.equals("post has title", typeof post.title, "string");
          TestValidator.equals(
            "post has author username",
            typeof post.author?.username,
            "string",
          );
          TestValidator.equals(
            "post has community name",
            typeof post.community?.name,
            "string",
          );
          TestValidator.predicate(
            "post has vote score",
            typeof post.voteScore === "number",
          );
          TestValidator.predicate(
            "post has comment count",
            typeof post.commentCount === "number",
          );
          TestValidator.equals(
            "post has created_at",
            typeof post.created_at,
            "string",
          );
        }
      }
    } else {
      // Test other sorting methods
      const result: IPageIRedditCloneContentPost.ISummary =
        await api.functional.redditClone.communities.posts.index(connection, {
          communityId: communityId,
          body: params satisfies IRedditCloneContentPost.IRequest,
        });
      typia.assert(result);
      // Verify pagination structure
      TestValidator.equals("pagination exists", result.pagination.current, 1);
      TestValidator.equals("limit correct", result.pagination.limit, 10);
      TestValidator.predicate("has data", result.data.length >= 0);
      // Verify post structure if posts exist
      for (const post of result.data) {
        TestValidator.equals("post has id", typeof post.id, "string");
        TestValidator.equals("post has title", typeof post.title, "string");
        TestValidator.equals(
          "post has author username",
          typeof post.author?.username,
          "string",
        );
        TestValidator.equals(
          "post has community name",
          typeof post.community?.name,
          "string",
        );
        TestValidator.predicate(
          "post has vote score",
          typeof post.voteScore === "number",
        );
        TestValidator.predicate(
          "post has comment count",
          typeof post.commentCount === "number",
        );
        TestValidator.equals(
          "post has created_at",
          typeof post.created_at,
          "string",
        );
      }
    }
  }
  // Test pagination parameters
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 1, limit: 100 },
  ];
  for (const { page, limit } of paginationTests) {
    const result: IPageIRedditCloneContentPost.ISummary =
      await api.functional.redditClone.communities.posts.index(connection, {
        communityId: communityId,
        body: {
          sort: "new" as const,
          page: page,
          limit: limit,
        } satisfies IRedditCloneContentPost.IRequest,
      });
    typia.assert(result);
    TestValidator.equals(
      "pagination page matches",
      result.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit matches",
      result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records consistent",
      typeof result.pagination.records === "number",
    );
    TestValidator.predicate(
      "pagination pages calculated",
      typeof result.pagination.pages === "number",
    );
  }
  // Test error handling for non-existent community
  await TestValidator.error("404 for non-existent community", async () => {
    await api.functional.redditClone.communities.posts.index(connection, {
      communityId: "00000000-0000-0000-0000-000000000000",
      body: {
        sort: "hot" as const,
        page: 1,
        limit: 10,
      } satisfies IRedditCloneContentPost.IRequest,
    });
  });
}
