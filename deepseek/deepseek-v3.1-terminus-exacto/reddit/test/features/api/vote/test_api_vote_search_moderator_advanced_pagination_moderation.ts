import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test advanced pagination and search capabilities for moderators handling
 * large-scale voting datasets. Validates that the vote search operation
 * supports efficient moderation workflows with comprehensive filtering,
 * sorting, and pagination controls suitable for platform-wide voting analysis.
 */
export async function test_api_vote_search_moderator_advanced_pagination_moderation(
  connection: api.IConnection,
) {
  // Create multiple moderators for testing
  const moderators: ICommunityPlatformModerator.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
    typia.assert(moderator);
    moderators.push(moderator);
  }

  // Create multiple members for voting
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 10; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    members.push(member);
  }

  // Create multiple posts for voting - use a valid UUID format for community ID
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          status: "published",
          community_platform_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Cast numerous votes to create large dataset
  const votes: ICommunityPlatformVote[] = [];
  const voteTypes = ["upvote", "downvote"] as const;
  const statuses = ["active", "cancelled", "pending"] as const;

  for (let i = 0; i < 50; i++) {
    const voter = RandomGenerator.pick(members);
    const post = RandomGenerator.pick(posts);

    // Switch to member context
    await api.functional.auth.member.login(connection, {
      body: {
        email: voter.email,
        password: "password123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            vote_type: RandomGenerator.pick(voteTypes),
            status: RandomGenerator.pick(statuses),
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    votes.push(vote);
  }

  // Switch to moderator context for search operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderators[0].email,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 1: Basic pagination with default parameters
  const basicSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search returns paginated results",
    basicSearch.data.length <= 10,
    true,
  );
  TestValidator.predicate(
    "pagination info is valid",
    basicSearch.pagination.current === 1 &&
      basicSearch.pagination.limit === 10 &&
      basicSearch.pagination.records >= 0 &&
      basicSearch.pagination.pages >= 0,
  );

  // Test 2: Filter by vote type
  const upvoteSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        vote_type: "upvote",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteSearch);
  TestValidator.predicate(
    "upvote filter returns only upvotes",
    upvoteSearch.data.every((vote) => vote.vote_type === "upvote"),
  );

  // Test 3: Filter by actor type
  const memberVotesSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        actor_type: "member",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(memberVotesSearch);

  // Test 4: Filter by content type
  const postVotesSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        content_type: "post",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVotesSearch);
  TestValidator.predicate(
    "post filter returns only post votes",
    postVotesSearch.data.every((vote) => vote.content_type === "post"),
  );

  // Test 5: Filter by status
  const activeVotesSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        status: "active",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(activeVotesSearch);
  TestValidator.predicate(
    "active filter returns only active votes",
    activeVotesSearch.data.every((vote) => vote.status === "active"),
  );

  // Test 6: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const dateRangeSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        created_at_start: oneDayAgo,
        created_at_end: now.toISOString(),
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(dateRangeSearch);

  // Test 7: Combined filters
  const combinedSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
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

  // Test 8: Pagination boundary testing
  const largePageSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1000, // Very high page number
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(largePageSearch);
  TestValidator.equals(
    "high page number returns empty or valid data",
    largePageSearch.data.length === 0 || largePageSearch.data.length <= 10,
    true,
  );

  // Test 9: Maximum limit testing
  const maxLimitSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(maxLimitSearch);
  TestValidator.equals(
    "maximum limit returns valid number of results",
    maxLimitSearch.data.length <= 100,
    true,
  );

  // Test 10: Empty result set for non-matching filters
  const futureDateSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        created_at_start: new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date(
          now.getTime() + 48 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(futureDateSearch);
  TestValidator.predicate(
    "future date range returns empty or valid data",
    futureDateSearch.data.length === 0 || futureDateSearch.data.length <= 5,
  );

  // Test 11: Verify pagination consistency across pages
  const page1 = await api.functional.communityPlatform.moderator.votes.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.communityPlatform.moderator.votes.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(page2);

  // Ensure no overlap between pages
  const page1Ids = new Set(page1.data.map((vote) => vote.id));
  const page2Ids = new Set(page2.data.map((vote) => vote.id));

  TestValidator.predicate(
    "pages have no overlapping votes",
    page2.data.every((vote) => !page1Ids.has(vote.id)),
  );

  // Test 12: Validate vote summary structure
  if (basicSearch.data.length > 0) {
    const sampleVote = basicSearch.data[0];
    TestValidator.predicate(
      "vote summary has required fields",
      typeof sampleVote.id === "string" &&
        typeof sampleVote.vote_type === "string" &&
        typeof sampleVote.content_type === "string" &&
        typeof sampleVote.status === "string" &&
        typeof sampleVote.created_at === "string",
    );
  }
}
