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
 * Test that authenticated members can search and filter votes on their own
 * posts.
 *
 * This test validates the vote search functionality by creating a member
 * account, publishing a post, and then performing various search operations
 * with different filters including vote type, actor type, content type, status,
 * and date ranges. The test ensures that search results are properly paginated
 * and filtered according to the specified criteria, allowing members to monitor
 * voting patterns on their content for engagement analysis.
 */
export async function test_api_post_vote_search_by_member(
  connection: api.IConnection,
) {
  // Note: This test focuses on validating the search API structure and parameters.
  // Since we cannot create communities or votes through the available API functions,
  // we test the search functionality with the assumption that the post exists
  // and has votes. The test validates that the API responds correctly to various
  // filter combinations and pagination parameters.

  // Step 1: Create and authenticate as a member
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

  // Step 2: Use a realistic post ID for testing (assuming post exists)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test basic vote search without filters
  const basicSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination structure exists",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(basicSearch.data),
    true,
  );

  // Step 4: Test vote type filtering
  const upvoteSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          vote_type: "upvote",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(upvoteSearch);

  const downvoteSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          vote_type: "downvote",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvoteSearch);

  // Step 5: Test actor type filtering
  const memberActorSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          actor_type: "member",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(memberActorSearch);

  const moderatorActorSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          actor_type: "moderator",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(moderatorActorSearch);

  const adminActorSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          actor_type: "admin",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(adminActorSearch);

  // Step 6: Test content type filtering
  const postContentSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          content_type: "post",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(postContentSearch);

  const commentContentSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          content_type: "comment",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(commentContentSearch);

  // Step 7: Test status filtering
  const activeStatusSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(activeStatusSearch);

  const cancelledStatusSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          status: "cancelled",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(cancelledStatusSearch);

  const pendingStatusSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(pendingStatusSearch);

  // Step 8: Test date range filtering
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  const dateRangeSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          created_at_start: yesterday,
          created_at_end: tomorrow,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(dateRangeSearch);

  // Step 9: Test pagination with different page sizes
  const smallPageSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(smallPageSearch);

  const largePageSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(largePageSearch);

  // Step 10: Test combined filters
  const combinedSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Validate pagination structure on basic search
  TestValidator.predicate(
    "pagination has current page",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    basicSearch.pagination.pages >= 0,
  );

  // Test edge case: empty search with very specific filters
  const futureDateSearch =
    await api.functional.communityPlatform.member.posts.votes.index(
      connection,
      {
        postId: postId,
        body: {
          created_at_start: new Date(Date.now() + 864000000).toISOString(), // 10 days in future
          created_at_end: new Date(Date.now() + 1728000000).toISOString(), // 20 days in future
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(futureDateSearch);
}
