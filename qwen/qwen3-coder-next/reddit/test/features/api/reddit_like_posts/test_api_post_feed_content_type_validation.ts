import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_content_type_validation(
  connection: api.IConnection,
): Promise<void> {
  const { host } = connection;
  // 1. Test basic post listing with pagination
  const basicPosts = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(basicPosts);
  TestValidator.predicate(
    "has pagination data",
    basicPosts.pagination !== null,
  );
  TestValidator.predicate("has data array", Array.isArray(basicPosts.data));
  // 2. Test sorting options
  for (const sort of ["hot", "new", "top", "controversial"] as const) {
    const sortedPosts = await api.functional.redditLike.posts.index(
      { host },
      {
        body: {
          sort,
          page: 1,
          limit: 5,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(sortedPosts);
    TestValidator.predicate(
      `sorted by ${sort}`,
      Array.isArray(sortedPosts.data),
    );
  }
  // 3. Test time range filtering (for top-sorted feeds)
  const timeFiltered = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        sort: "top",
        time: "week",
        page: 1,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeFiltered);
  TestValidator.predicate("time filtered result", timeFiltered.data !== null);
  // 4. Test community filtering
  const communityFiltered = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(communityFiltered);
  // 5. Test author filtering
  const authorFiltered = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        author_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(authorFiltered);
  // 6. Test date range filtering
  const dateFiltered = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        created_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        created_to: new Date("2024-12-31T23:59:59Z").toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // 7. Test pagination metadata structure
  const paginated = await api.functional.redditLike.posts.index(
    { host },
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records count",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginated.pagination.pages >= 0,
  );
}
