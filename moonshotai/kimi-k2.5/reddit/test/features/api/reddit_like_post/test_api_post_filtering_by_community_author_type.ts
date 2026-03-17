import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test post filtering capabilities by community_id, author_id, post_type,
 * and date range. Verifies that filters work individually and in combination
 * using AND logic. Confirms pagination metadata adjusts appropriately.
 */
export async function test_api_post_filtering_by_community_author_type(
  connection: api.IConnection,
): Promise<void> {
  // Test filter by communityId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilterResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: { communityId } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(communityFilterResult);
  // Validate that all returned posts belong to the specified community
  if (communityFilterResult.data.length > 0) {
    TestValidator.predicate("all posts have matching communityId", () =>
      communityFilterResult.data.every(
        (post) => post.community.id === communityId,
      ),
    );
  }
  // Test filter by authorId
  const authorId = typia.random<string & tags.Format<"uuid">>();
  const authorFilterResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: { authorId } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(authorFilterResult);
  // Validate that all returned posts are by the specified author
  if (authorFilterResult.data.length > 0) {
    TestValidator.predicate("all posts have matching authorId", () =>
      authorFilterResult.data.every((post) => post.author.id === authorId),
    );
  }
  // Test filter by postType for each possible type
  const postTypes = ["text", "link", "image"] as const;
  for (const postType of postTypes) {
    const typeFilterResult = await api.functional.redditLike.posts.index(
      connection,
      {
        body: { postType } satisfies Partial<IRedditLikePost.IRequest>,
      },
    );
    typia.assert(typeFilterResult);
    // Validate that all returned posts match the specified post type
    if (typeFilterResult.data.length > 0) {
      TestValidator.predicate(`all posts have post_type '${postType}'`, () =>
        typeFilterResult.data.every((post) => post.post_type === postType),
      );
    }
  }
  // Test date range filtering (createdAfter and createdBefore)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const dateRangeFilterResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        createdAfter: oneWeekAgo.toISOString(),
        createdBefore: threeDaysAgo.toISOString(),
      } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(dateRangeFilterResult);
  // Validate that all returned posts are within the date range
  if (dateRangeFilterResult.data.length > 0) {
    TestValidator.predicate("all posts within date range", () =>
      dateRangeFilterResult.data.every((post) => {
        const postDate = new Date(post.created_at);
        return postDate >= oneWeekAgo && postDate <= threeDaysAgo;
      }),
    );
  }
  // Test combined filters (AND logic)
  const combinedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const combinedAuthorId = typia.random<string & tags.Format<"uuid">>();
  const combinedFiltersResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        communityId: combinedCommunityId,
        authorId: combinedAuthorId,
        postType: "text",
        limit: 10,
      } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(combinedFiltersResult);
  // Validate that all returned posts match ALL filter criteria
  if (combinedFiltersResult.data.length > 0) {
    TestValidator.predicate("all posts match combined filter criteria", () =>
      combinedFiltersResult.data.every(
        (post) =>
          post.community.id === combinedCommunityId &&
          post.author.id === combinedAuthorId &&
          post.post_type === "text",
      ),
    );
  }
  // Test pagination with filters
  const paginationResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        communityId,
        page: 1,
        limit: 5,
      } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginationResult.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "limit is as requested",
    paginationResult.pagination.limit,
    5 satisfies number as number,
  );
  TestValidator.predicate(
    "records count is valid",
    () => paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is consistent with records",
    () =>
      paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // Validate data length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    () => paginationResult.data.length <= 5,
  );
  // Test all available filtering parameters at once
  const allFiltersResult = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(5),
        communityId: typia.random<string & tags.Format<"uuid">>(),
        authorId: typia.random<string & tags.Format<"uuid">>(),
        postType: "link",
        sort: "top",
        sortBy: "created_at",
        sortOrder: "desc",
        timeFilter: "week",
        page: 1,
        limit: 20,
      } satisfies Partial<IRedditLikePost.IRequest>,
    },
  );
  typia.assert(allFiltersResult);
  // Validate basic structure of the comprehensive filter result
  TestValidator.equals(
    "page in pagination",
    allFiltersResult.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "limit in pagination",
    allFiltersResult.pagination.limit,
    20 satisfies number as number,
  );
}
