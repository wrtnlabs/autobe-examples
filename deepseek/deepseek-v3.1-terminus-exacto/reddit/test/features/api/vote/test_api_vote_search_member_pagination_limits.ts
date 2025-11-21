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
 * Test vote search pagination functionality for authenticated members.
 * Validates that the search operation correctly implements pagination controls
 * including page navigation, limit enforcement, and record counting. Tests
 * various page sizes, boundary conditions, and empty result scenarios to ensure
 * robust pagination implementation that handles large voting datasets
 * efficiently.
 */
export async function test_api_vote_search_member_pagination_limits(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
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

  // 2. Create multiple test posts for voting operations
  const posts = await ArrayUtil.asyncRepeat(10, async (index) => {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: `Test Post ${index + 1}`,
          post_type: "text",
          status: "published",
          community_platform_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // 3. Cast multiple votes on posts to create pagination test data
  const votes = await ArrayUtil.asyncRepeat(15, async (index) => {
    const post = RandomGenerator.pick(posts);
    const vote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
            actor_type: "member",
            content_type: "post",
            status: "active",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    return vote;
  });

  // 4. Test pagination with different limits
  const limitTests = [1, 5, 10, 20, 50] as const;

  for (const limit of limitTests) {
    // Test first page
    const firstPage = await api.functional.communityPlatform.member.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit satisfies number as number,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
    typia.assert(firstPage);

    TestValidator.equals(
      `page 1 with limit ${limit} should return correct number of items`,
      firstPage.data.length,
      Math.min(limit, firstPage.pagination.records),
    );

    TestValidator.predicate(
      `page 1 with limit ${limit} should have valid pagination metadata`,
      firstPage.pagination.current === 1 &&
        firstPage.pagination.limit === limit &&
        firstPage.pagination.records >= votes.length &&
        firstPage.pagination.pages >= Math.ceil(votes.length / limit),
    );

    // Test middle page if available
    if (firstPage.pagination.pages > 2) {
      const middlePage =
        await api.functional.communityPlatform.member.votes.index(connection, {
          body: {
            page: Math.floor(firstPage.pagination.pages / 2),
            limit: limit satisfies number as number,
          } satisfies ICommunityPlatformVote.IRequest,
        });
      typia.assert(middlePage);

      TestValidator.equals(
        `middle page with limit ${limit} should have correct current page`,
        middlePage.pagination.current,
        Math.floor(firstPage.pagination.pages / 2),
      );
    }

    // Test last page
    const lastPage = await api.functional.communityPlatform.member.votes.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages,
          limit: limit satisfies number as number,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
    typia.assert(lastPage);

    TestValidator.equals(
      `last page with limit ${limit} should have correct current page`,
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );

    // Test beyond last page (should return empty or last page)
    const beyondPage =
      await api.functional.communityPlatform.member.votes.index(connection, {
        body: {
          page: firstPage.pagination.pages + 1,
          limit: limit satisfies number as number,
        } satisfies ICommunityPlatformVote.IRequest,
      });
    typia.assert(beyondPage);

    TestValidator.predicate(
      `page beyond last page with limit ${limit} should handle gracefully`,
      beyondPage.data.length === 0 ||
        beyondPage.pagination.current === firstPage.pagination.pages,
    );
  }

  // 5. Test limit enforcement
  const largeLimitTest =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100 satisfies number as number, // Maximum allowed limit
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(largeLimitTest);

  TestValidator.predicate(
    "limit 100 should be enforced correctly",
    largeLimitTest.pagination.limit <= 100 && largeLimitTest.data.length <= 100,
  );

  // 6. Test empty result scenario with filtering
  const emptyResult = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
        actor_type: "admin", // Should return empty since we only created member votes
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(emptyResult);

  TestValidator.predicate(
    "filtered search with no matches should return empty data",
    emptyResult.data.length === 0 && emptyResult.pagination.records === 0,
  );

  // 7. Test record counting accuracy
  const allVotes = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Large limit to get most votes
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(allVotes);

  TestValidator.predicate(
    "total record count should be consistent",
    allVotes.pagination.records >= votes.length,
  );
}
