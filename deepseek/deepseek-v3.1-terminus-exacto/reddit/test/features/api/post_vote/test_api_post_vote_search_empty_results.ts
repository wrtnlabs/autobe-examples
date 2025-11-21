import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test vote search functionality when no votes exist on a post.
 *
 * This test validates that the vote search API properly handles scenarios where
 * no voting activity has occurred on newly created content. The test creates a
 * member account, creates a post without any votes, and performs vote search
 * operations to verify that empty result sets are handled correctly with proper
 * pagination metadata.
 */
export async function test_api_post_vote_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post without any votes
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Perform vote search with various filter combinations
  // Test default pagination (no parameters)
  const defaultSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(defaultSearch);

  // Validate empty result set
  TestValidator.equals("data array should be empty", defaultSearch.data, []);
  TestValidator.equals(
    "total records should be zero",
    defaultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "total pages should be zero",
    defaultSearch.pagination.pages,
    0,
  );

  // Test with specific pagination parameters
  const paginatedSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  // Validate pagination with explicit parameters
  TestValidator.equals(
    "data array should be empty with pagination",
    paginatedSearch.data,
    [],
  );
  TestValidator.equals(
    "total records should be zero with pagination",
    paginatedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should match request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be zero with pagination",
    paginatedSearch.pagination.pages,
    0,
  );

  // Test with various vote type filters (should all return empty)
  const voteTypeFilters: Array<"upvote" | "downvote" | undefined> = [
    "upvote",
    "downvote",
    undefined,
  ];

  for (const voteType of voteTypeFilters) {
    const filteredSearch =
      await api.functional.communityPlatform.member.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            vote_type: voteType,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(filteredSearch);

    TestValidator.equals(
      `data should be empty for vote type ${voteType}`,
      filteredSearch.data,
      [],
    );
    TestValidator.equals(
      `records should be zero for vote type ${voteType}`,
      filteredSearch.pagination.records,
      0,
    );
  }

  // Test with actor type filters
  const actorTypeFilters: Array<"member" | "moderator" | "admin" | undefined> =
    ["member", "moderator", "admin", undefined];

  for (const actorType of actorTypeFilters) {
    const filteredSearch =
      await api.functional.communityPlatform.member.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            actor_type: actorType,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(filteredSearch);

    TestValidator.equals(
      `data should be empty for actor type ${actorType}`,
      filteredSearch.data,
      [],
    );
    TestValidator.equals(
      `records should be zero for actor type ${actorType}`,
      filteredSearch.pagination.records,
      0,
    );
  }

  // Test with content type filters
  const contentTypeFilters: Array<"post" | "comment" | undefined> = [
    "post",
    "comment",
    undefined,
  ];

  for (const contentType of contentTypeFilters) {
    const filteredSearch =
      await api.functional.communityPlatform.member.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            content_type: contentType,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(filteredSearch);

    TestValidator.equals(
      `data should be empty for content type ${contentType}`,
      filteredSearch.data,
      [],
    );
    TestValidator.equals(
      `records should be zero for content type ${contentType}`,
      filteredSearch.pagination.records,
      0,
    );
  }

  // Test with status filters
  const statusFilters: Array<"active" | "cancelled" | "pending" | undefined> = [
    "active",
    "cancelled",
    "pending",
    undefined,
  ];

  for (const status of statusFilters) {
    const filteredSearch =
      await api.functional.communityPlatform.member.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            status: status,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(filteredSearch);

    TestValidator.equals(
      `data should be empty for status ${status}`,
      filteredSearch.data,
      [],
    );
    TestValidator.equals(
      `records should be zero for status ${status}`,
      filteredSearch.pagination.records,
      0,
    );
  }

  // Test with date range filters (should return empty regardless of dates)
  const dateFilteredSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          created_at_start: new Date().toISOString(),
          created_at_end: new Date(Date.now() + 86400000).toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(dateFilteredSearch);

  TestValidator.equals(
    "data should be empty with date filters",
    dateFilteredSearch.data,
    [],
  );
  TestValidator.equals(
    "records should be zero with date filters",
    dateFilteredSearch.pagination.records,
    0,
  );
}
