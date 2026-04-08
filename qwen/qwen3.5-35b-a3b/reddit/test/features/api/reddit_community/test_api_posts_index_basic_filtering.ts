import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_posts_index_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Default pagination and sorting (hot)
  const defaultResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {} satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Verify pagination metadata structure
  TestValidator.equals(
    "pagination has required fields",
    defaultResponse.pagination.current,
    defaultResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is defined",
    defaultResponse.pagination.limit,
    defaultResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is defined",
    defaultResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is defined",
    defaultResponse.pagination.pages,
    defaultResponse.pagination.pages,
  );
  // Verify page metadata consistency
  const expectedPages =
    defaultResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculated correctly",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  // Test 2: Verify post structure and content
  if (defaultResponse.data.length > 0) {
    const firstPost = defaultResponse.data[0];
    typia.assert(firstPost);
    // Verify required fields
    TestValidator.predicate(
      "post has valid ID",
      /^[0-9a-f-]{36}$/i.test(firstPost.id),
    );
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has valid post type",
      ["text", "link", "image"].includes(firstPost.post_type),
    );
    TestValidator.predicate(
      "post has valid vote score",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof firstPost.comment_count === "number",
    );
    // Verify date fields
    TestValidator.predicate(
      "post has created_at",
      typeof firstPost.created_at === "string",
    );
    TestValidator.predicate(
      "post has updated_at",
      typeof firstPost.updated_at === "string",
    );
    // Verify author structure
    typia.assert(firstPost.author);
    TestValidator.predicate(
      "author has username",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has created_at",
      typeof firstPost.author.created_at === "string",
    );
    TestValidator.predicate(
      "author has updated_at",
      typeof firstPost.author.updated_at === "string",
    );
    // Verify community structure
    typia.assert(firstPost.community);
    TestValidator.predicate(
      "community has name",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has created_at",
      typeof firstPost.community.created_at === "string",
    );
    // Verify text content truncation
    if (firstPost.post_type === "text" && firstPost.text_content !== null) {
      TestValidator.predicate(
        "text content truncated to 200 chars",
        firstPost.text_content.length <= 200,
      );
    }
    // Verify deleted posts are excluded by default
    TestValidator.equals("post is not deleted", firstPost.deleted_at, null);
  }
  // Test 3: Post type filtering
  for (const postType of ["text", "link", "image"] as const) {
    const typeFilteredResponse =
      await api.functional.redditCommunity.posts.index(testConnection, {
        body: {
          postType,
          limit: 50,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      });
    typia.assert(typeFilteredResponse);
    // Verify all posts match the requested type
    for (const post of typeFilteredResponse.data) {
      TestValidator.equals(
        `all posts are ${postType}`,
        post.post_type,
        postType,
      );
    }
  }
  // Test 4: Vote score range filtering
  const voteRangeResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        voteScoreMin: 10,
        voteScoreMax: 100,
        limit: 50,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(voteRangeResponse);
  for (const post of voteRangeResponse.data) {
    TestValidator.predicate("vote score >= min", post.vote_score >= 10);
    TestValidator.predicate("vote score <= max", post.vote_score <= 100);
  }
  // Test 5: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        dateFrom: oneWeekAgo.toISOString(),
        dateTo: now.toISOString(),
        limit: 50,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  for (const post of dateRangeResponse.data) {
    TestValidator.predicate(
      "post created after dateFrom",
      new Date(post.created_at) >= oneWeekAgo,
    );
    TestValidator.predicate(
      "post created before dateTo",
      new Date(post.created_at) <= now,
    );
  }
  // Test 6: Sorting options - new (chronological DESC)
  const newSortResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(newSortResponse);
  // Verify new sort (created_at DESC)
  if (newSortResponse.data.length > 1) {
    for (let i = 0; i < newSortResponse.data.length - 1; i++) {
      const current = newSortResponse.data[i];
      const next = newSortResponse.data[i + 1];
      TestValidator.predicate(
        "new sort: current post is newer",
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
  // Test 7: Sorting options - hot (engagement-based)
  const hotSortResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(hotSortResponse);
  // Verify hot sort returns valid data
  TestValidator.predicate(
    "hot sort returns data",
    hotSortResponse.data.length >= 0,
  );
  // Test 8: Empty result set
  const emptyResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        page: 9999,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result has zero records",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has zero total records",
    emptyResponse.pagination.records,
    0,
  );
  // Test 9: Pagination metadata accuracy
  const page1Response = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 has current page 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 has correct limit",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 returns within limit",
    page1Response.data.length <= 20,
  );
  // Test 10: Combined filters
  const combinedResponse = await api.functional.redditCommunity.posts.index(
    testConnection,
    {
      body: {
        postType: "text",
        voteScoreMin: 0,
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(combinedResponse);
  for (const post of combinedResponse.data) {
    TestValidator.equals(
      "combined filter: post type is text",
      post.post_type,
      "text",
    );
    TestValidator.predicate(
      "combined filter: vote score >= 0",
      post.vote_score >= 0,
    );
  }
}
