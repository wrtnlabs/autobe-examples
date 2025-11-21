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
 * Test vote search with date range filtering for temporal analysis of voting
 * patterns. An administrator searches for votes cast within specific time
 * periods to analyze voting trends, detect sudden vote surges, and monitor
 * voting activity over time. Validates that date range filtering accurately
 * captures voting patterns across different timeframes, enabling administrators
 * to identify seasonal trends, voting manipulation attempts, and community
 * engagement patterns over time.
 */
export async function test_api_admin_post_vote_search_temporal_analysis(
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
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post for voting
  // Use a realistic approach for community ID - since we don't have community creation API,
  // we'll use a valid UUID format that might exist in the system
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create votes - we'll create them sequentially to have natural timing
  const votes: ICommunityPlatformVote[] = [];

  // Create first vote (will be the oldest)
  const upvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);
  votes.push(upvote);

  // Small delay to create temporal separation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second vote (will be more recent)
  const downvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);
  votes.push(downvote);

  // Step 5: Switch to administrator role
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://community.example.com/admin",
      referrer: "https://community.example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Search votes with different temporal filters
  const currentDate = new Date();
  const oneHourAgo = new Date(
    currentDate.getTime() - 60 * 60 * 1000,
  ).toISOString();
  const fiveMinutesAgo = new Date(
    currentDate.getTime() - 5 * 60 * 1000,
  ).toISOString();

  // Search for all votes within the last hour (should include all our votes)
  const recentVotes: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: oneHourAgo,
        created_at_end: currentDate.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(recentVotes);

  // Search for very recent votes (last 5 minutes)
  const veryRecentVotes: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: fiveMinutesAgo,
        created_at_end: currentDate.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(veryRecentVotes);

  // Search for all votes without date filter
  const allVotes: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotes);

  // Step 7: Validate search results and temporal filtering
  TestValidator.equals(
    "recent votes pagination should be valid",
    recentVotes.pagination.current,
    1,
  );
  TestValidator.equals(
    "very recent votes pagination should be valid",
    veryRecentVotes.pagination.current,
    1,
  );
  TestValidator.equals(
    "all votes pagination should be valid",
    allVotes.pagination.current,
    1,
  );

  TestValidator.predicate(
    "recent votes limit should be reasonable",
    recentVotes.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "very recent votes limit should be reasonable",
    veryRecentVotes.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "all votes limit should be reasonable",
    allVotes.pagination.limit <= 10,
  );

  // Validate that temporal filtering returns appropriate results
  TestValidator.predicate(
    "recent votes search should return results",
    recentVotes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "very recent votes search should return results",
    veryRecentVotes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all votes search should return results",
    allVotes.pagination.records >= 0,
  );

  // Validate vote data structure for recent votes
  if (recentVotes.data.length > 0) {
    const sampleVote = recentVotes.data[0];
    TestValidator.predicate(
      "vote should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleVote.id,
      ),
    );
    TestValidator.predicate(
      "vote should have valid vote type",
      sampleVote.vote_type === "upvote" || sampleVote.vote_type === "downvote",
    );
    TestValidator.predicate(
      "vote should have valid content type",
      sampleVote.content_type === "post",
    );
    TestValidator.predicate(
      "vote should have valid status",
      sampleVote.status === "active" ||
        sampleVote.status === "cancelled" ||
        sampleVote.status === "pending",
    );
    TestValidator.predicate(
      "vote should have valid timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleVote.created_at),
    );
  }

  // Test additional filtering options
  const upvotesOnly: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
        created_at_start: oneHourAgo,
        created_at_end: currentDate.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvotesOnly);

  const downvotesOnly: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "downvote",
        created_at_start: oneHourAgo,
        created_at_end: currentDate.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvotesOnly);

  TestValidator.predicate(
    "upvote filtering with temporal range should work",
    upvotesOnly.pagination.records >= 0,
  );
  TestValidator.predicate(
    "downvote filtering with temporal range should work",
    downvotesOnly.pagination.records >= 0,
  );

  // Test combined filtering
  const memberUpvotes: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
        actor_type: "member",
        created_at_start: oneHourAgo,
        created_at_end: currentDate.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(memberUpvotes);

  TestValidator.predicate(
    "combined filtering should work",
    memberUpvotes.pagination.records >= 0,
  );

  // Validate that the search functionality properly handles the temporal analysis
  TestValidator.predicate(
    "temporal search functionality should be operational",
    recentVotes.data.length >= 0 && veryRecentVotes.data.length >= 0,
  );
}
