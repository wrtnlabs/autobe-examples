import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test pagination boundary conditions for vote search on comments.
 *
 * This test validates the pagination functionality of the vote search API by:
 *
 * 1. Creating a complete community and comment infrastructure
 * 2. Generating multiple votes from different members on a single comment
 * 3. Testing pagination with various limit values (1, 10, 50, 100)
 * 4. Verifying pagination metadata accuracy
 * 5. Testing boundary cases like first page, middle pages, and beyond-available
 *    pages
 * 6. Ensuring all records are accessible without duplicates or missing data
 *
 * Steps:
 *
 * 1. Create administrator and category for infrastructure
 * 2. Create member account and authentication
 * 3. Create community and post
 * 4. Create comment on the post
 * 5. Create multiple member accounts and cast votes on the comment
 * 6. Test pagination with limit=1 (minimum boundary)
 * 7. Test pagination with limit=10 and traverse multiple pages
 * 8. Test pagination with limit=50 and verify metadata
 * 9. Test pagination with limit=100 (maximum boundary)
 * 10. Test requesting page beyond available pages
 * 11. Verify all votes are collected without duplicates
 */
export async function test_api_comment_votes_pagination_boundary(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member account and authenticate
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(10);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(12),
        password: creatorPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 6: Create multiple member accounts and cast votes
  const votesToCreate = 15; // Total votes for testing pagination

  for (let i = 0; i < votesToCreate; i++) {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voterPassword = RandomGenerator.alphabets(10);
    const voter: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: voterEmail,
          username: RandomGenerator.alphabets(10),
          password: voterPassword,
          href: "https://example.com",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(voter);

    // Cast vote on the comment
    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            content_type: "comment",
            content_id: comment.id,
            vote_type: i % 2 === 0 ? "upvote" : "downvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
  }

  // Switch back to creator for testing
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Test pagination with limit=1 (minimum boundary)
  const page1Limit1: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 with limit 1 should return exactly 1 record",
    page1Limit1.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination total records should match vote count",
    page1Limit1.pagination.records,
    votesToCreate,
  );

  // Step 8: Test pagination with limit=10 and traverse multiple pages
  const page1Limit10: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 with limit 10 should return 10 records",
    page1Limit10.data.length,
    10,
  );
  TestValidator.equals(
    "pagination pages should be 2 (15 records / 10 limit = 1.5, rounded up to 2)",
    page1Limit10.pagination.pages,
    2,
  );

  const page2Limit10: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(page2Limit10);
  TestValidator.equals(
    "page 2 with limit 10 should return remaining 5 records",
    page2Limit10.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 current page should be 2",
    page2Limit10.pagination.current,
    2,
  );

  // Verify no duplicate records between pages
  const page1Ids = page1Limit10.data.map((v) => v.id);
  const page2Ids = page2Limit10.data.map((v) => v.id);
  const allIds = [...page1Ids, ...page2Ids];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "all vote records should be unique across pages",
    uniqueIds.size,
    allIds.length,
  );

  // Step 9: Test pagination with limit=50 and verify metadata
  const page1Limit50: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(page1Limit50);
  TestValidator.equals(
    "page 1 with limit 50 should return all 15 records",
    page1Limit50.data.length,
    votesToCreate,
  );
  TestValidator.equals(
    "pagination pages should be 1 when all records fit in one page",
    page1Limit50.pagination.pages,
    1,
  );

  // Step 10: Test pagination with limit=100 (maximum boundary)
  const page1Limit100: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 with limit 100 should return all 15 records",
    page1Limit100.data.length,
    votesToCreate,
  );
  TestValidator.predicate(
    "limit should be respected at maximum boundary",
    page1Limit100.pagination.limit <= 100,
  );

  // Step 11: Test requesting page beyond available pages
  const beyondLastPage: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "requesting page beyond available should return empty data",
    beyondLastPage.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata should still be valid for beyond-last-page request",
    beyondLastPage.pagination.records === votesToCreate,
  );

  // Step 12: Verify all votes collected without duplicates through iteration
  const allVotes: ICommunityPlatformVote.ISummary[] = [];
  let currentPage = 1;
  const itemsPerPage = 5;

  while (true) {
    const pageResult: IPageICommunityPlatformVote.ISummary =
      await api.functional.communityPlatform.member.comments.votes.index(
        connection,
        {
          commentId: comment.id,
          body: {
            page: currentPage,
            limit: itemsPerPage,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(pageResult);

    if (pageResult.data.length === 0) {
      break;
    }

    allVotes.push(...pageResult.data);
    currentPage++;
  }

  TestValidator.equals(
    "collecting all votes through pagination should return all records",
    allVotes.length,
    votesToCreate,
  );

  // Verify no duplicates in collected votes
  const collectedIds = allVotes.map((v) => v.id);
  const uniqueCollectedIds = new Set(collectedIds);
  TestValidator.equals(
    "collected votes should have no duplicates",
    uniqueCollectedIds.size,
    collectedIds.length,
  );
}
