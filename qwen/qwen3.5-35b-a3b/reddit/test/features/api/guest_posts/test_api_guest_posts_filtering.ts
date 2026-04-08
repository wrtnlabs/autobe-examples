import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_posts_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Step 1: Get all posts to identify sample data
  const allPostsResult = await api.functional.redditPlatform.guest.posts.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(allPostsResult);
  TestValidator.equals("posts found", allPostsResult.data.length > 0, true);
  TestValidator.equals(
    "pagination valid",
    allPostsResult.pagination.records > 0,
    true,
  );
  // Extract sample posts for testing
  const samplePosts = allPostsResult.data;
  // Helper to get unique values from array
  function getUnique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }
  const samplePostTypes = getUnique(samplePosts.map((p) => p.post_type)) as Array<"text" | "link" | "image">;
  const sampleCommunities = getUnique(samplePosts.map((p) => p.community.id));
  const sampleAuthors = getUnique(samplePosts.map((p) => p.author.id));
  if (samplePosts.length === 0) {
    TestValidator.predicate("has test data", false);
    return;
  }
  // Step 2: Test post_type filter
  for (const postType of samplePostTypes) {
    const filteredByType =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          post_type: postType,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredByType);
    const expectedCount = samplePosts.filter(
      (p) => p.post_type === postType,
    ).length;
    TestValidator.equals(
      `post_type filter ${postType} count`,
      filteredByType.data.length,
      expectedCount,
    );
    TestValidator.predicate(
      `all posts are ${postType}`,
      filteredByType.data.every((p) => p.post_type === postType),
    );
  }
  // Step 3: Test community_id filter
  for (const communityId of sampleCommunities) {
    const filteredByCommunity =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          community_id: communityId,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredByCommunity);
    const expectedCount = samplePosts.filter(
      (p) => p.community.id === communityId,
    ).length;
    TestValidator.equals(
      "community_id filter count",
      filteredByCommunity.data.length,
      expectedCount,
    );
    TestValidator.predicate(
      "all posts from community",
      filteredByCommunity.data.every((p) => p.community.id === communityId),
    );
    // Verify each post's community reference is correct
    for (const post of filteredByCommunity.data) {
      TestValidator.equals(
        "community ID matches filter",
        post.community.id,
        communityId,
      );
    }
  }
  // Step 4: Test author_id filter
  for (const authorId of sampleAuthors) {
    const filteredByAuthor =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          author_id: authorId,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredByAuthor);
    const expectedCount = samplePosts.filter(
      (p) => p.author.id === authorId,
    ).length;
    TestValidator.equals(
      "author_id filter count",
      filteredByAuthor.data.length,
      expectedCount,
    );
    TestValidator.predicate(
      "all posts by author",
      filteredByAuthor.data.every((p) => p.author.id === authorId),
    );
    // Verify each post's author reference is correct
    for (const post of filteredByAuthor.data) {
      TestValidator.equals(
        "author ID matches filter",
        post.author.id,
        authorId,
      );
    }
  }
  // Step 5: Test title_search filter (case-insensitive)
  if (samplePosts.length > 0) {
    const sampleTitle = samplePosts[0].title;
    const searchTerm = sampleTitle.substring(
      0,
      Math.min(5, sampleTitle.length),
    );
    const filteredBySearch =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          title_search: searchTerm,
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredBySearch);
    TestValidator.predicate(
      "search returns results",
      filteredBySearch.data.length > 0,
    );
    TestValidator.predicate(
      `all results contain search term "${searchTerm}"`,
      filteredBySearch.data.every((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }
  // Step 6: Test date range filter
  if (samplePosts.length > 1) {
    // Sort posts by created_at to get a range
    const sortedByDate = [...samplePosts].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const startDate = sortedByDate[0].created_at;
    const endDate =
      sortedByDate[Math.min(10, sortedByDate.length - 1)].created_at;
    const filteredByDateRange =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredByDateRange);
    TestValidator.predicate(
      "date range returns results",
      filteredByDateRange.data.length > 0,
    );
    TestValidator.predicate(
      "all posts within date range",
      filteredByDateRange.data.every((p) => {
        const postDate = new Date(p.created_at).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return postDate >= start && postDate <= end;
      }),
    );
  }
  // Step 7: Test combined filters (AND logic)
  if (sampleCommunities.length > 0 && samplePostTypes.length > 0) {
    const combinedFilter =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          community_id: sampleCommunities[0],
          post_type: samplePostTypes[0],
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(combinedFilter);
    TestValidator.predicate(
      "combined filter returns results",
      combinedFilter.data.length >= 0,
    );
    TestValidator.predicate(
      "all results match both filters",
      combinedFilter.data.every(
        (p) =>
          p.community.id === sampleCommunities[0] &&
          p.post_type === samplePostTypes[0],
      ),
    );
  }
  // Step 8: Test empty results when no posts match
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  const emptyResult = await api.functional.redditPlatform.guest.posts.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "new",
        community_id: nonExistentId,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results with non-existent filter",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination with empty results",
    emptyResult.pagination.records,
    0,
  );
  // Step 9: Verify pagination works with filtered results
  if (samplePosts.length > 0) {
    const filteredResult =
      await api.functional.redditPlatform.guest.posts.index(guestConnection, {
        body: {
          page: 1,
          limit: 10,
          sort: "new",
          post_type: samplePostTypes[0],
        } satisfies IRedditPlatformPost.IRequest,
      });
    typia.assert(filteredResult);
    TestValidator.equals(
      "page 1 limit 10 returns expected count",
      filteredResult.data.length <= 10,
      true,
    );
    TestValidator.equals(
      "pagination records matches total filtered",
      filteredResult.pagination.records,
      samplePosts.filter((p) => p.post_type === samplePostTypes[0]).length,
    );
    TestValidator.equals(
      "pagination current page",
      filteredResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit",
      filteredResult.pagination.limit,
      10,
    );
    // Test page 2
    const page2Result = await api.functional.redditPlatform.guest.posts.index(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "new",
          post_type: samplePostTypes[0],
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 returns correct page number",
      page2Result.pagination.current,
      2,
    );
  }
  // Step 10: Verify each post summary has correct structure
  for (const post of samplePosts) {
    typia.assert(post);
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals("post has author", post.author !== undefined, true);
    TestValidator.equals(
      "post has community",
      post.community !== undefined,
      true,
    );
    // Verify author reference
    TestValidator.equals("author has id", post.author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      post.author.username !== undefined,
      true,
    );
    // Verify community reference
    TestValidator.equals(
      "community has id",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      post.community.name !== undefined,
      true,
    );
  }
  // Step 11: Verify vote counts are integers
  for (const post of samplePosts.slice(0, 10)) {
    TestValidator.equals(
      "upvotes_count is number",
      typeof post.upvotes_count,
      "number",
    );
    TestValidator.equals(
      "downvotes_count is number",
      typeof post.downvotes_count,
      "number",
    );
    TestValidator.equals(
      "comment_count is number",
      typeof post.comment_count,
      "number",
    );
    TestValidator.predicate(
      "upvotes_count is non-negative",
      post.upvotes_count >= 0,
    );
    TestValidator.predicate(
      "downvotes_count is non-negative",
      post.downvotes_count >= 0,
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
  }
}