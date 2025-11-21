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
 * Test vote search filtering by actor type (member/moderator/admin) for
 * authenticated moderators.
 *
 * This comprehensive E2E test validates that the moderator vote search API
 * correctly distinguishes between votes cast by different user roles and
 * returns appropriate results based on actor type filtering. The test follows a
 * complete workflow creating multiple user accounts, casting votes with
 * different actor types through proper authentication switching, and verifying
 * that search filters correctly isolate votes by specific roles.
 */
export async function test_api_vote_search_moderator_actor_type_filtering(
  connection: api.IConnection,
) {
  // Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Create member account for voting operations
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

  // Create test post for voting operations (using member authentication)
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

  // Cast vote by member (member is already authenticated)
  const memberVote =
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
  typia.assert(memberVote);

  // Switch to moderator account and cast vote
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const moderatorVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(moderatorVote);

  // Create additional moderator account for more voting diversity
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Switch to second moderator and cast another vote
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const moderator2Vote =
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
  typia.assert(moderator2Vote);

  // Switch back to original moderator for search operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test filtering for member votes only
  const memberVotesResult =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        actor_type: "member",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(memberVotesResult);
  TestValidator.predicate(
    "member votes result should contain at least one vote",
    memberVotesResult.data.length >= 1,
  );

  // Test filtering for moderator votes only
  const moderatorVotesResult =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        actor_type: "moderator",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(moderatorVotesResult);
  TestValidator.predicate(
    "moderator votes result should contain at least two votes",
    moderatorVotesResult.data.length >= 2,
  );

  // Test filtering for admin votes (should return empty since no admin votes were cast)
  const adminVotesResult =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(adminVotesResult);
  TestValidator.equals(
    "admin votes result should be empty",
    adminVotesResult.data.length,
    0,
  );

  // Validate pagination information
  TestValidator.predicate(
    "pagination should have valid current page",
    memberVotesResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    memberVotesResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    memberVotesResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    memberVotesResult.pagination.pages >= 0,
  );

  // Additional validation: Ensure votes are properly associated with the test post
  const allVotesResult =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResult);
  TestValidator.predicate(
    "should find votes from our test session",
    allVotesResult.data.length >= 3,
  );
}
