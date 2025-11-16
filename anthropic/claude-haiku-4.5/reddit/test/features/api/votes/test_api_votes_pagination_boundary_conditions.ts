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

export async function test_api_votes_pagination_boundary_conditions(
  connection: api.IConnection,
) {
  // Setup: Register members, create category, community, posts, and comments
  // Then test pagination boundary conditions on the votes listing endpoint

  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create administrator and login to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 3. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member context to create community and posts
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create test posts for potential voting
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${i + 1}`,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // 6. Create test comments
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 5; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: posts[0].id,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 7. Test pagination boundary conditions on votes endpoint
  // Note: Vote creation is not available through the API, so we test with existing system votes

  // Test Case 1: Basic pagination with page=1, limit=1
  const page1Limit1: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(page1Limit1);
  TestValidator.equals(
    "pagination current page set to 1",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit set to 1",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "page 1 limit 1 returns at most 1 record",
    page1Limit1.data.length <= 1,
  );

  // Test Case 2: Maximum limit (100)
  const maxLimitResponse: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit set to 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "returns data within limit",
    maxLimitResponse.data.length <= 100,
  );

  // Test Case 3: Pagination metadata consistency
  const firstPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "first page number correct",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit correct",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages >= 0,
  );

  // Test Case 4: Page beyond total pages returns appropriate result
  const pageBeyond: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(pageBeyond);
  TestValidator.predicate(
    "out of range page returns empty or graceful response",
    pageBeyond.data.length === 0,
  );

  // Test Case 5: Page zero boundary
  const zeroPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 0,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(zeroPage);
  // API handles invalid pagination gracefully

  // Test Case 6: Multiple pages with consistent data structure
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.index(connection, {
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number correct",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit correct",
      secondPage.pagination.limit,
      10,
    );

    // Verify no duplicate records between pages
    const firstPageIds = firstPage.data.map((v) => v.id);
    const secondPageIds = secondPage.data.map((v) => v.id);
    const noDuplicates = firstPageIds.every(
      (id) => !secondPageIds.includes(id),
    );
    TestValidator.predicate("no duplicate records across pages", noDuplicates);
  }

  // Test Case 7: Filtering with pagination - vote type filter
  const upvoteFiltered: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteFiltered);
  TestValidator.predicate(
    "filtered votes contain only requested type",
    upvoteFiltered.data.every(
      (v) => v.vote_type === "upvote" || upvoteFiltered.data.length === 0,
    ),
  );

  // Test Case 8: Content type filtering with pagination
  const postVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        content_type: "post",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVotes);
  TestValidator.predicate(
    "filtered by content type contains only posts",
    postVotes.data.every(
      (v) => v.content_type === "post" || postVotes.data.length === 0,
    ),
  );

  // Test Case 9: Last page boundary
  const lastPageNumber = firstPage.pagination.pages;
  if (lastPageNumber > 0) {
    const lastPage: IPageICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.index(connection, {
        body: {
          page: lastPageNumber,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      });
    typia.assert(lastPage);
    TestValidator.equals(
      "last page number matches calculation",
      lastPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page has appropriate record count",
      lastPage.data.length <= 10,
    );
  }

  // Test Case 10: Limit boundary - minimum (1) and maximum (100)
  const minLimit: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(minLimit);
  TestValidator.equals("minimum limit boundary", minLimit.pagination.limit, 1);
  TestValidator.predicate(
    "minimum limit returns at most 1 record",
    minLimit.data.length <= 1,
  );
}
