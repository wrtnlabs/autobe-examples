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
 * Test vote search as part of moderator content review workflow.
 *
 * This E2E test validates the moderator's ability to search and filter votes on
 * a specific post to identify potential vote manipulation patterns and analyze
 * community sentiment. The test covers multi-actor authentication, post
 * creation, and comprehensive vote search functionality with various filtering
 * options including vote status, date ranges, and pagination.
 */
export async function test_api_post_vote_search_moderation_workflow(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator account
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

  // 2. Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoinResponse);

  // 3. Switch to member role and create post
  const memberLoginResponse = await api.functional.auth.member.login(
    connection,
    {
      body: {
        email: memberEmail,
        password: "password123",
        href: "https://example.com/post",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(memberLoginResponse);

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
  TestValidator.equals("post has valid ID", typeof post.id, "string");
  TestValidator.equals("post has title", typeof post.title, "string");
  TestValidator.equals(
    "post has community ID",
    typeof post.community_platform_community_id,
    "string",
  );

  // 4. Switch back to moderator role
  const moderatorLoginResponse = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorLoginResponse);

  // 5. Test vote search with various filters
  // Basic search without filters
  const basicSearch =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(basicSearch);
  await TestValidator.equals(
    "pagination metadata present",
    typeof basicSearch.pagination,
    "object",
  );
  await TestValidator.equals(
    "data is array",
    Array.isArray(basicSearch.data),
    true,
  );

  // Validate pagination structure
  await TestValidator.predicate(
    "pagination has current page",
    basicSearch.pagination.current >= 0,
  );
  await TestValidator.predicate(
    "pagination has limit",
    basicSearch.pagination.limit > 0,
  );
  await TestValidator.predicate(
    "pagination has records count",
    basicSearch.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination has pages count",
    basicSearch.pagination.pages >= 0,
  );

  // Search with vote status filter
  const statusSearch =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(statusSearch);
  await TestValidator.equals(
    "status search returns valid data",
    Array.isArray(statusSearch.data),
    true,
  );

  // Search with date range filter
  const dateSearch =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(dateSearch);
  await TestValidator.equals(
    "date search returns valid data",
    Array.isArray(dateSearch.data),
    true,
  );

  // Search with multiple filters
  const complexSearch =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(complexSearch);
  await TestValidator.equals(
    "complex search returns valid data",
    Array.isArray(complexSearch.data),
    true,
  );

  // Validate vote summary structure if votes exist
  if (complexSearch.data.length > 0) {
    const vote = complexSearch.data[0];
    await TestValidator.equals("vote has ID", typeof vote.id, "string");
    await TestValidator.equals(
      "vote has type",
      typeof vote.vote_type,
      "string",
    );
    await TestValidator.equals(
      "vote has content type",
      typeof vote.content_type,
      "string",
    );
    await TestValidator.equals("vote has status", typeof vote.status, "string");
    await TestValidator.equals(
      "vote has creation timestamp",
      typeof vote.created_at,
      "string",
    );
  }
}
