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
 * Test vote search filtering by vote type (upvote/downvote) for authenticated
 * members. Validates that the search operation correctly distinguishes between
 * positive and negative voting patterns and returns appropriate results based
 * on vote direction.
 */
export async function test_api_vote_search_member_filter_by_vote_type(
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

  // 2. Create test posts for voting operations
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // 3. Cast upvote on first post
  const upvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post1.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);

  // 4. Cast downvote on second post
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post2.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // 5. Test search with upvote filter
  const upvoteResults =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        vote_type: "upvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteResults);
  TestValidator.equals(
    "upvote filter returns only upvotes",
    upvoteResults.data.length,
    1,
  );
  TestValidator.equals(
    "upvote filter contains correct vote",
    upvoteResults.data[0].vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote filter contains correct content type",
    upvoteResults.data[0].content_type,
    "post",
  );

  // 6. Test search with downvote filter
  const downvoteResults =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        vote_type: "downvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteResults);
  TestValidator.equals(
    "downvote filter returns only downvotes",
    downvoteResults.data.length,
    1,
  );
  TestValidator.equals(
    "downvote filter contains correct vote",
    downvoteResults.data[0].vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote filter contains correct content type",
    downvoteResults.data[0].content_type,
    "post",
  );

  // 7. Test search without filter (should return all votes)
  const allResults = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.equals(
    "no filter returns all votes",
    allResults.data.length,
    2,
  );
  TestValidator.predicate(
    "mixed votes contain both types",
    allResults.data.some((v) => v.vote_type === "upvote") &&
      allResults.data.some((v) => v.vote_type === "downvote"),
  );

  // 8. Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    allResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allResults.pagination.limit >= 1 && allResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    allResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    allResults.pagination.pages >= 0,
  );

  // 9. Validate vote status is active
  TestValidator.equals(
    "upvote status is active",
    upvoteResults.data[0].status,
    "active",
  );
  TestValidator.equals(
    "downvote status is active",
    downvoteResults.data[0].status,
    "active",
  );
}
