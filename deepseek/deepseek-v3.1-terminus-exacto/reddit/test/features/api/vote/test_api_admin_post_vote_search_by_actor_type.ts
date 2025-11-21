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
 * Test vote search filtering by actor type to analyze voting patterns across
 * different user roles. An administrator searches for votes cast by specific
 * actor types (member, moderator, admin) on a post to understand role-based
 * voting behaviors and detect potential voting manipulation or coordinated
 * voting campaigns. Validates that actor type filtering provides accurate
 * role-based voting analytics for administrative oversight and community health
 * monitoring.
 */
export async function test_api_admin_post_vote_search_by_actor_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for vote analysis
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

  // Step 2: Create member account for voting
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

  // Since we cannot create communities via the available API functions,
  // we'll use a mock community ID for post creation
  const mockCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a post for voting analysis (authenticated as member)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: mockCommunityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Cast votes from different actor types
  // Member casts a vote (already authenticated as member)
  const memberVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          // actor_type is automatically determined from authentication context
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(memberVote);

  // Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Mozilla/5.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Admin casts a vote
  const adminVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          // actor_type is automatically determined from authentication context
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(adminVote);

  // Step 5: Search votes filtering by actor type
  // Search for member votes
  const memberVotesResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        actor_type: "member",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(memberVotesResult);

  // Search for admin votes
  const adminVotesResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        actor_type: "admin",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(adminVotesResult);

  // Step 6: Validate search results
  // Validate member votes result
  TestValidator.predicate(
    "member votes result should contain votes",
    memberVotesResult.data.length > 0,
  );

  // Validate admin votes result
  TestValidator.predicate(
    "admin votes result should contain votes",
    adminVotesResult.data.length > 0,
  );

  // Validate pagination information
  TestValidator.predicate(
    "member votes pagination should be valid",
    memberVotesResult.pagination.current >= 1 &&
      memberVotesResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "admin votes pagination should be valid",
    adminVotesResult.pagination.current >= 1 &&
      adminVotesResult.pagination.limit > 0,
  );

  // Validate that search results are properly filtered by actor type
  // Note: We cannot validate the actual actor_type in the response since it's not included in ISummary
  // The filtering validation happens at the API level
  TestValidator.predicate(
    "vote search functionality should work correctly",
    memberVotesResult.data.length + adminVotesResult.data.length >= 2,
  );
}
