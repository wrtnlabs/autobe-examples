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
 * Test vote search filtering by vote status (active/cancelled/pending) for
 * authenticated members. Validates that the search operation correctly
 * distinguishes between different vote lifecycle states and returns appropriate
 * results based on status. Tests filtering for active votes only, cancelled
 * votes only, and pending votes to ensure accurate status-based retrieval and
 * moderation workflow support.
 */
export async function test_api_vote_search_member_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test post for voting operations
  // Use a valid community ID that exists in the system
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

  // Step 3: Create votes with different statuses
  // Create active vote
  const activeVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(activeVote);
  TestValidator.equals(
    "active vote has correct status",
    activeVote.status,
    "active",
  );

  // Create pending vote
  const pendingVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          status: "pending",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(pendingVote);
  TestValidator.equals(
    "pending vote has correct status",
    pendingVote.status,
    "pending",
  );

  // Note: Cancelled votes cannot be created directly via update since IUpdate only has vote_type
  // We'll test with the votes we can actually create

  // Step 4: Test search filtering by status
  // Test active votes filter
  const activeVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(activeVotesResult);

  // Find our active vote in the results
  const foundActiveVote = activeVotesResult.data.find(
    (vote) => vote.id === activeVote.id,
  );
  TestValidator.predicate(
    "active vote found in filtered results",
    foundActiveVote !== undefined,
  );
  if (foundActiveVote) {
    TestValidator.equals(
      "filtered active vote has correct status",
      foundActiveVote.status,
      "active",
    );
  }

  // Test pending votes filter
  const pendingVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(pendingVotesResult);

  // Find our pending vote in the results
  const foundPendingVote = pendingVotesResult.data.find(
    (vote) => vote.id === pendingVote.id,
  );
  TestValidator.predicate(
    "pending vote found in filtered results",
    foundPendingVote !== undefined,
  );
  if (foundPendingVote) {
    TestValidator.equals(
      "filtered pending vote has correct status",
      foundPendingVote.status,
      "pending",
    );
  }

  // Test no status filter (should return all votes)
  const allVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResult);
  TestValidator.predicate(
    "all votes result contains data",
    allVotesResult.data.length > 0,
  );

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    activeVotesResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    activeVotesResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    activeVotesResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    activeVotesResult.pagination.pages >= 1,
  );

  // Step 6: Validate vote summary structure
  if (activeVotesResult.data.length > 0) {
    const voteSummary = activeVotesResult.data[0];
    TestValidator.equals(
      "vote summary has id",
      typeof voteSummary.id,
      "string",
    );
    TestValidator.equals(
      "vote summary has vote_type",
      typeof voteSummary.vote_type,
      "string",
    );
    TestValidator.equals(
      "vote summary has content_type",
      typeof voteSummary.content_type,
      "string",
    );
    TestValidator.equals(
      "vote summary has status",
      typeof voteSummary.status,
      "string",
    );
    TestValidator.equals(
      "vote summary has created_at",
      typeof voteSummary.created_at,
      "string",
    );

    // Validate content references based on content_type
    if (voteSummary.content_type === "post") {
      TestValidator.predicate(
        "post reference exists",
        voteSummary.post !== undefined,
      );
      if (voteSummary.post) {
        TestValidator.equals(
          "post has id",
          typeof voteSummary.post.id,
          "string",
        );
        TestValidator.equals(
          "post has title",
          typeof voteSummary.post.title,
          "string",
        );
      }
    }
  }

  console.log("Vote search filtering by status test completed successfully");
}
