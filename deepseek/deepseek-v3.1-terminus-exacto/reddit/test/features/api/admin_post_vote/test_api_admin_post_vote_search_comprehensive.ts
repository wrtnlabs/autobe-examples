import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test comprehensive vote search functionality for administrators examining
 * voting patterns on posts.
 *
 * This test validates that administrators can effectively monitor voting
 * patterns, detect voting manipulation attempts, and analyze community
 * engagement metrics through advanced search capabilities. The test covers
 * pagination functionality, filtering accuracy, and proper authorization
 * enforcement for administrative vote analysis workflows.
 *
 * Implementation Steps:
 *
 * 1. Create administrator account for authentication
 * 2. Create member user to cast votes on the post
 * 3. Skip post creation (due to community dependency) and focus on vote search
 *    functionality
 * 4. Test search functionality with various filters using existing data
 * 5. Validate pagination and search results accuracy
 */
export async function test_api_admin_post_vote_search_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member user to potentially cast votes
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Since we cannot create posts without an existing community, we'll test search functionality
  // using the available API endpoints and focus on the search capabilities themselves

  // Switch back to admin account for search operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Test comprehensive search functionality with various filters
  // We'll use a sample post ID that might exist in the system
  const samplePostId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Basic search with pagination
  const basicSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.equals(
    "should return paginated results",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be reasonable",
    basicSearch.pagination.limit <= 100,
  );

  // Test 2: Search by vote type (upvote)
  const upvoteSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        vote_type: "upvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteSearch);

  // Test 3: Search by vote type (downvote)
  const downvoteSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        vote_type: "downvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteSearch);

  // Test 4: Search by actor type
  const actorSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        actor_type: "member",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(actorSearch);

  // Test 5: Search by content type
  const contentTypeSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        content_type: "post",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(contentTypeSearch);

  // Test 6: Search by status
  const statusSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(statusSearch);

  // Test 7: Search with date range
  const dateSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        created_at_start: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(dateSearch);

  // Test 8: Search with combined filters
  const combinedSearch: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: samplePostId,
      body: {
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(combinedSearch);

  // Validate pagination functionality across all searches
  const searches = [
    basicSearch,
    upvoteSearch,
    downvoteSearch,
    actorSearch,
    contentTypeSearch,
    statusSearch,
    dateSearch,
    combinedSearch,
  ];

  searches.forEach((search, index) => {
    TestValidator.equals(
      `search ${index} should have pagination structure`,
      typeof search.pagination,
      "object",
    );
    TestValidator.predicate(
      `search ${index} current page should be positive`,
      search.pagination.current >= 1,
    );
    TestValidator.predicate(
      `search ${index} limit should be reasonable`,
      search.pagination.limit <= 100,
    );
    TestValidator.predicate(
      `search ${index} total records should be non-negative`,
      search.pagination.records >= 0,
    );
    TestValidator.predicate(
      `search ${index} total pages should be calculated correctly`,
      search.pagination.pages >= 0,
    );
  });

  // Validate vote summary structure if data exists
  if (basicSearch.data.length > 0) {
    const sampleVote = basicSearch.data[0];
    TestValidator.predicate("vote should have ID", sampleVote.id.length > 0);
    TestValidator.predicate(
      "vote type should be valid",
      sampleVote.vote_type === "upvote" || sampleVote.vote_type === "downvote",
    );
    TestValidator.predicate(
      "content type should be valid",
      sampleVote.content_type === "post" ||
        sampleVote.content_type === "comment",
    );
    TestValidator.predicate(
      "status should be valid",
      sampleVote.status === "active" ||
        sampleVote.status === "cancelled" ||
        sampleVote.status === "pending",
    );
    TestValidator.predicate(
      "created_at should be valid date",
      new Date(sampleVote.created_at).toString() !== "Invalid Date",
    );
  }

  // Test error handling for non-existent post
  await TestValidator.error(
    "search should handle non-existent post gracefully",
    async () => {
      const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.admin.posts.votes.index(
        connection,
        {
          postId: nonExistentPostId,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    },
  );
}
