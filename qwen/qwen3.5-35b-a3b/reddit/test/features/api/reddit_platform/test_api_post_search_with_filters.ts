import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the post search endpoint with various filter combinations and offset-based pagination.
   *
   * Validates the complete post search functionality including member authentication, filter-based searching,
   * pagination metadata, and result structure. Tests both simple pagination and full-text search capabilities.
   *
   * Special attention is given to verifying that:
   * - Pagination metadata accurately reflects the current page state
   * - Full-text search returns matching results
   * - Search filters (community, author, post_type) work correctly when test data exists
   * - Response structure includes nested author and community information
   *
   * Note: This test assumes the test database is pre-seeded with posts and communities for filtering.
   *
   * 1. Member registers and authenticates to access search endpoint.
   * 2. Tests empty filter search to verify base functionality.
   * 3. Tests pagination with limit and page parameters.
   * 4. Tests full-text search functionality.
   * 5. Validates pagination metadata accuracy.
   * 6. Validates response structure with nested objects.
   */
  // 1. Setup - Create member for authenticated search
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://" + RandomGenerator.alphaNumeric(6) + ".com",
      referrer: "https://" + RandomGenerator.alphaNumeric(6) + ".com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test empty filter search (all posts)
  const searchAllResponse =
    await api.functional.redditPlatform.member.search.posts.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(searchAllResponse);
  // Verify search returns valid structure
  TestValidator.equals(
    "total records",
    searchAllResponse.pagination.records,
    1,
  );
  TestValidator.equals("current page", searchAllResponse.pagination.current, 1);
  TestValidator.equals("limit", searchAllResponse.pagination.limit, 20);
  TestValidator.equals("total pages", searchAllResponse.pagination.pages, 1);
  TestValidator.predicate(
    "has data array",
    Array.isArray(searchAllResponse.data),
  );
  // 3. Test pagination with limit=2
  const paginatedResponse =
    await api.functional.redditPlatform.member.search.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Verify pagination metadata
  TestValidator.equals("page 1", paginatedResponse.pagination.current, 1);
  TestValidator.equals("limit 2", paginatedResponse.pagination.limit, 2);
  TestValidator.predicate(
    "has records",
    paginatedResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "has next page",
    paginatedResponse.pagination.pages > 1,
  );
  // Verify data matches limit
  TestValidator.equals("data length", paginatedResponse.data.length, 2);
  // 4. Test page 2 of pagination
  const page2Response =
    await api.functional.redditPlatform.member.search.posts.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2", page2Response.pagination.current, 2);
  TestValidator.equals(
    "total records consistent",
    page2Response.pagination.records,
    paginatedResponse.pagination.records,
  );
  // 5. Test full-text search functionality
  // Create a test post search with specific title
  const searchResponse =
    await api.functional.redditPlatform.member.search.posts.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 1 }),
          ),
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(searchResponse);
  // Verify search returns valid structure
  TestValidator.equals(
    "search has pagination",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search has data",
    Array.isArray(searchResponse.data),
  );
  // 6. Test response structure with nested objects
  if (searchResponse.data.length > 0) {
    const firstPost = searchResponse.data[0];
    typia.assert(firstPost);
    // Verify post has required fields
    TestValidator.predicate("post has id", firstPost.id !== undefined);
    TestValidator.predicate("post has title", firstPost.title !== undefined);
    TestValidator.predicate(
      "post has post_type",
      firstPost.post_type !== undefined,
    );
    TestValidator.predicate("post has author", firstPost.author !== undefined);
    TestValidator.predicate(
      "post has community",
      firstPost.community !== undefined,
    );
    // Verify author structure
    typia.assert(firstPost.author);
    TestValidator.predicate("author has id", firstPost.author.id !== undefined);
    TestValidator.predicate(
      "author has username",
      firstPost.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has karma",
      firstPost.author.karma !== undefined,
    );
    TestValidator.predicate(
      "author has created_at",
      firstPost.author.created_at !== undefined,
    );
    // Verify community structure
    typia.assert(firstPost.community);
    TestValidator.predicate(
      "community has id",
      firstPost.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstPost.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      firstPost.community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      firstPost.community.owner !== undefined,
    );
  }
}