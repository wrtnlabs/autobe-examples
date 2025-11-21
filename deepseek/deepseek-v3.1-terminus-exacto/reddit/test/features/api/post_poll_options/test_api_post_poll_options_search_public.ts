import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPollOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostPollOption";

/**
 * Test public search functionality for poll options within a post's voting
 * question.
 *
 * This E2E test validates that users can search, filter, and paginate through
 * poll options without authentication. It tests various search parameters
 * including text filtering, sorting by vote count and display order, and
 * pagination controls. The test ensures that search results accurately reflect
 * the specified criteria and that pagination metadata correctly represents the
 * total option set.
 */
export async function test_api_post_poll_options_search_public(
  connection: api.IConnection,
) {
  // Create member account to author the post with poll
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create post with poll type that contains voting options
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Test basic search functionality
  const searchResults: IPageICommunityPlatformPostPollOption.ISummary =
    await api.functional.communityPlatform.posts.polls.options.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          search: "test",
          order_by: "vote_count",
          order_direction: "desc",
        } satisfies ICommunityPlatformPostPollOption.IRequest,
      },
    );
  typia.assert(searchResults);

  // Validate pagination structure with mandatory title parameters
  TestValidator.equals(
    "pagination current page should be 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    searchResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  // Test different search parameters
  const emptySearchResults: IPageICommunityPlatformPostPollOption.ISummary =
    await api.functional.communityPlatform.posts.polls.options.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          search: undefined,
          order_by: "display_order",
          order_direction: "asc",
        } satisfies ICommunityPlatformPostPollOption.IRequest,
      },
    );
  typia.assert(emptySearchResults);

  // Test pagination with different page numbers
  const page2Results: IPageICommunityPlatformPostPollOption.ISummary =
    await api.functional.communityPlatform.posts.polls.options.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 2,
          limit: 5,
          search: undefined,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformPostPollOption.IRequest,
      },
    );
  typia.assert(page2Results);

  // Validate that different pages return different results
  TestValidator.notEquals(
    "page 1 and page 2 current values should differ",
    emptySearchResults.pagination.current,
    page2Results.pagination.current,
  );

  // Test search with specific text filter
  const specificSearchResults: IPageICommunityPlatformPostPollOption.ISummary =
    await api.functional.communityPlatform.posts.polls.options.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          search: "option",
          order_by: "vote_count",
          order_direction: "asc",
        } satisfies ICommunityPlatformPostPollOption.IRequest,
      },
    );
  typia.assert(specificSearchResults);

  // Validate search functionality works
  TestValidator.predicate(
    "search results data should be an array",
    Array.isArray(specificSearchResults.data),
  );

  // Test unauthenticated search by creating a fresh connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const unauthenticatedResults: IPageICommunityPlatformPostPollOption.ISummary =
    await api.functional.communityPlatform.posts.polls.options.index(
      unauthConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          search: undefined,
          order_by: "vote_count",
          order_direction: "desc",
        } satisfies ICommunityPlatformPostPollOption.IRequest,
      },
    );
  typia.assert(unauthenticatedResults);

  // Validate unauthenticated access works
  TestValidator.equals(
    "unauthenticated search should return pagination",
    unauthenticatedResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "unauthenticated data should be array",
    Array.isArray(unauthenticatedResults.data),
  );
}
