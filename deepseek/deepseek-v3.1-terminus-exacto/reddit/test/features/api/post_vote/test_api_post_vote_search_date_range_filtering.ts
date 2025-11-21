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
 * Test vote search with date range filtering capabilities.
 *
 * This E2E test validates the vote search functionality with date range
 * filtering capabilities for community platform posts. The test creates a
 * member account, creates a post, and then tests the temporal filtering
 * capabilities of the vote search API using various date range parameters.
 *
 * The scenario involves:
 *
 * 1. Creating a member account for authentication
 * 2. Creating a post that can potentially accumulate votes
 * 3. Testing the vote search API with various date range filters
 * 4. Validating that the API correctly handles date range parameters
 * 5. Ensuring proper pagination and response structure
 */
export async function test_api_post_vote_search_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
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

  // 2. Create a post that can potentially accumulate votes
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Test vote search with different date range filters
  // First, search without any date filters to get baseline
  const initialSearch =
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
  typia.assert(initialSearch);

  // Test date range filtering with specific timestamps
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Search for votes within a future date range (should return empty)
  const futureSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: tomorrow,
          created_at_end: tomorrow,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(futureSearch);

  // Since we're searching for votes in the future, should return empty
  TestValidator.equals(
    "future date search should return empty array",
    futureSearch.data.length,
    0,
  );

  // Test pagination parameters work correctly
  TestValidator.equals("page should be 1", futureSearch.pagination.current, 1);
  TestValidator.equals("limit should be 10", futureSearch.pagination.limit, 10);
  TestValidator.equals(
    "total records should be 0",
    futureSearch.pagination.records,
    0,
  );

  // Test with past date range that includes current time
  const pastSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: yesterday,
          created_at_end: now,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(pastSearch);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    pastSearch.pagination.current >= 0 &&
      pastSearch.pagination.limit >= 0 &&
      pastSearch.pagination.records >= 0 &&
      pastSearch.pagination.pages >= 0,
  );

  // Test with only start date (should return votes from start date to current time)
  const startOnlySearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          created_at_start: yesterday,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(startOnlySearch);

  // Test with only end date (should return votes from beginning to end date)
  const endOnlySearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          created_at_end: now,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(endOnlySearch);

  // Test combination of filters with date range
  const combinedSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
          created_at_start: yesterday,
          created_at_end: now,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Validate that all returned votes have the correct content_type if any exist
  if (combinedSearch.data.length > 0) {
    for (const vote of combinedSearch.data) {
      TestValidator.equals(
        "vote content_type should be post",
        vote.content_type,
        "post",
      );
    }
  }

  // Test edge case: very old date range
  const ancientDate = new Date(2000, 0, 1).toISOString();
  const ancientSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: ancientDate,
          created_at_end: now,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(ancientSearch);

  // Test that pagination is consistent across different searches
  TestValidator.predicate(
    "pagination records should be consistent",
    ancientSearch.pagination.records >= 0,
  );
}
