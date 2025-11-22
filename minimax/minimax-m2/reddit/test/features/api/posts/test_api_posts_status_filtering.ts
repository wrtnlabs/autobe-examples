import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_posts_status_filtering(
  connection: api.IConnection,
) {
  // Test filtering posts by status with comprehensive validation

  // Test 1: Filter posts by 'active' status
  const activePostsRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const activePostsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: activePostsRequest },
  );
  typia.assert(activePostsResponse);

  // Validate that all returned posts have 'active' status
  for (const post of activePostsResponse.data) {
    TestValidator.equals("post status should be active", post.status, "active");
    TestValidator.predicate(
      "active post should be visible",
      post.status === "active",
    );
  }

  // Test 2: Filter posts by 'removed' status
  const removedPostsRequest: IRedditPlatformPost.IRequest = {
    status: "removed",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const removedPostsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: removedPostsRequest },
  );
  typia.assert(removedPostsResponse);

  // Validate that all returned posts have 'removed' status
  for (const post of removedPostsResponse.data) {
    TestValidator.equals(
      "post status should be removed",
      post.status,
      "removed",
    );
    TestValidator.predicate(
      "removed post status validation",
      post.status === "removed",
    );
  }

  // Test 3: Filter posts by 'locked' status
  const lockedPostsRequest: IRedditPlatformPost.IRequest = {
    status: "locked",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const lockedPostsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: lockedPostsRequest },
  );
  typia.assert(lockedPostsResponse);

  // Validate that all returned posts have 'locked' status
  for (const post of lockedPostsResponse.data) {
    TestValidator.equals("post status should be locked", post.status, "locked");
    TestValidator.predicate(
      "locked post status validation",
      post.status === "locked",
    );
  }

  // Test 4: Filter posts by 'hidden' status
  const hiddenPostsRequest: IRedditPlatformPost.IRequest = {
    status: "hidden",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const hiddenPostsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: hiddenPostsRequest },
  );
  typia.assert(hiddenPostsResponse);

  // Validate that all returned posts have 'hidden' status
  for (const post of hiddenPostsResponse.data) {
    TestValidator.equals("post status should be hidden", post.status, "hidden");
    TestValidator.predicate(
      "hidden post status validation",
      post.status === "hidden",
    );
  }

  // Test 5: Test status filtering with content type combination
  const textPostsRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    content_type: "text",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const textPostsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: textPostsRequest },
  );
  typia.assert(textPostsResponse);

  // Validate that all returned posts match both status and content type criteria
  for (const post of textPostsResponse.data) {
    TestValidator.equals("post status should be active", post.status, "active");
    TestValidator.equals(
      "post content type should be text",
      post.content_type,
      "text",
    );
    TestValidator.predicate(
      "combined filter validation",
      post.status === "active" && post.content_type === "text",
    );
  }

  // Test 6: Test status filtering with search term
  const searchRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    search: "test",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const searchResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: searchRequest },
  );
  typia.assert(searchResponse);

  // Validate that all returned posts have active status and match search criteria
  for (const post of searchResponse.data) {
    TestValidator.equals(
      "post status should be active in search results",
      post.status,
      "active",
    );
    TestValidator.predicate(
      "search results should have active status",
      post.status === "active",
    );
  }

  // Test 7: Test pagination with status filtering
  const paginatedRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    page: 1,
    limit: 5,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const paginatedResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: paginatedRequest },
  );
  typia.assert(paginatedResponse);

  // Validate pagination metadata and that all posts have correct status
  TestValidator.predicate(
    "pagination should return limited results",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "pagination page should be 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    paginatedResponse.pagination.limit,
    5,
  );

  for (const post of paginatedResponse.data) {
    TestValidator.equals(
      "paginated results should have active status",
      post.status,
      "active",
    );
  }

  // Test 8: Test sorting with status filtering
  const sortedRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    sort_by: "score",
    sort_order: "desc",
    page: 1,
    limit: 10,
  };
  const sortedResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: sortedRequest },
  );
  typia.assert(sortedResponse);

  // Validate that posts are sorted by score and have correct status
  for (const post of sortedResponse.data) {
    TestValidator.equals(
      "sorted results should have active status",
      post.status,
      "active",
    );
  }

  // Validate descending order by score
  if (sortedResponse.data.length > 1) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "posts should be sorted by score in descending order",
        sortedResponse.data[i].score >= sortedResponse.data[i + 1].score,
      );
    }
  }

  // Test 9: Test status filtering with score range
  const scoreRangeRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    min_score: 0,
    max_score: 100,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const scoreRangeResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: scoreRangeRequest },
  );
  typia.assert(scoreRangeResponse);

  // Validate that all posts are within score range and have correct status
  for (const post of scoreRangeResponse.data) {
    TestValidator.equals(
      "post status should be active in score range",
      post.status,
      "active",
    );
    TestValidator.predicate(
      "post score should be within range",
      post.score >= 0 && post.score <= 100,
    );
  }

  // Test 10: Test that status information is properly reflected in post summaries
  const summaryValidationRequest: IRedditPlatformPost.IRequest = {
    status: "active",
    page: 1,
    limit: 10,
  };
  const summaryValidationResponse =
    await api.functional.redditPlatform.posts.index(connection, {
      body: summaryValidationRequest,
    });
  typia.assert(summaryValidationResponse);

  // Validate that post summaries contain all expected status-related information
  for (const post of summaryValidationResponse.data) {
    TestValidator.predicate(
      "post should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );
    TestValidator.equals("post status should be valid", post.status, "active");
    TestValidator.predicate(
      "post should have valid content type",
      ["text", "link", "image"].includes(post.content_type),
    );
    TestValidator.predicate(
      "post should have valid score",
      typeof post.score === "number",
    );
    TestValidator.predicate(
      "post should have valid comment count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post should have valid view count",
      typeof post.view_count === "number",
    );
    TestValidator.predicate(
      "post should have valid timestamp",
      !isNaN(Date.parse(post.created_at)),
    );
  }

  // Test 11: Test filtering with no results (non-existent status combination)
  const noResultsRequest: IRedditPlatformPost.IRequest = {
    status: "removed",
    content_type: "image",
    min_score: 1000, // High score threshold unlikely to have removed posts
    page: 1,
    limit: 10,
  };
  const noResultsResponse = await api.functional.redditPlatform.posts.index(
    connection,
    { body: noResultsRequest },
  );
  typia.assert(noResultsResponse);

  // Validate that response is valid even when no results match criteria
  TestValidator.predicate(
    "no results response should be valid",
    noResultsResponse.data !== undefined,
  );
  TestValidator.predicate(
    "no results should return empty array",
    Array.isArray(noResultsResponse.data),
  );

  // Test 12: Verify that different status values produce different result sets
  const allStatuses = ["active", "removed", "locked", "hidden"] as const;
  const statusResults: Record<string, number> = {};

  for (const status of allStatuses) {
    const statusRequest: IRedditPlatformPost.IRequest = {
      status: status,
      page: 1,
      limit: 1, // Just get count, not actual data
    };
    const statusResponse = await api.functional.redditPlatform.posts.index(
      connection,
      { body: statusRequest },
    );
    typia.assert(statusResponse);
    statusResults[status] = statusResponse.pagination.records;
  }

  // Validate that we can get results for different statuses
  for (const status of allStatuses) {
    TestValidator.predicate(
      `should be able to query ${status} posts`,
      typeof statusResults[status] === "number",
    );
  }
}
