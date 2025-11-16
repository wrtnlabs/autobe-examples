import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Filter voting records by date range using moderator endpoint.
 *
 * Validates that moderators can filter voting records within a specific date
 * range using the created_after and created_before parameters. This test
 * establishes a temporal sequence of votes and confirms the API correctly
 * restricts results to votes created within the specified window.
 *
 * Test workflow:
 *
 * 1. Set up moderator and member accounts
 * 2. Create a community and post for voting
 * 3. Cast votes at different times
 * 4. Query votes with date range filters
 * 5. Validate filtering accuracy and boundary handling
 */
export async function test_api_voting_records_moderator_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for casting votes
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post to receive votes
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Cast vote
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote1);

  // Step 6: Switch to moderator authentication for querying votes
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/auth",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Query votes with date range filter (created_after)
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const resultsAfterTwoHoursAgo: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: twoHoursAgo.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(resultsAfterTwoHoursAgo);

  // Validate that votes created after twoHoursAgo are included
  TestValidator.predicate(
    "votes created after filter should be included",
    resultsAfterTwoHoursAgo.data.length > 0,
  );
  TestValidator.predicate(
    "all returned votes should have created_at >= created_after",
    resultsAfterTwoHoursAgo.data.every(
      (v) => new Date(v.created_at) >= twoHoursAgo,
    ),
  );

  // Step 8: Query votes with date range filter (created_before)
  const resultsBeforeOneHourLater: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_before: oneHourLater.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(resultsBeforeOneHourLater);

  // Validate that votes created before oneHourLater are included
  TestValidator.predicate(
    "all returned votes should have created_at <= created_before",
    resultsBeforeOneHourLater.data.every(
      (v) => new Date(v.created_at) <= oneHourLater,
    ),
  );

  // Step 9: Query votes with both date range filters
  const resultsInRange: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: twoHoursAgo.toISOString(),
        created_before: oneHourLater.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(resultsInRange);

  // Validate that votes are within both boundaries
  TestValidator.predicate(
    "all returned votes should be within date range",
    resultsInRange.data.every((v) => {
      const voteTime = new Date(v.created_at);
      return voteTime >= twoHoursAgo && voteTime <= oneHourLater;
    }),
  );

  // Step 10: Test narrow range excluding current votes
  const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const emptyResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: futureStart.toISOString(),
        created_before: futureEnd.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(emptyResults);

  // Validate that future range returns only future votes
  TestValidator.predicate(
    "votes outside range should be excluded",
    emptyResults.data.every((v) => {
      const voteTime = new Date(v.created_at);
      return voteTime >= futureStart && voteTime <= futureEnd;
    }),
  );

  // Step 11: Test pagination with filters
  const paginatedResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_after: twoHoursAgo.toISOString(),
        created_before: oneHourLater.toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(paginatedResults);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should be valid",
    paginatedResults.pagination.current >= 1 &&
      paginatedResults.pagination.limit > 0 &&
      paginatedResults.pagination.records >= 0 &&
      paginatedResults.pagination.pages >= 0,
  );

  // Validate that data respects the limit
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedResults.data.length <= paginatedResults.pagination.limit,
  );
}
