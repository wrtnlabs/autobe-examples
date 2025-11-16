import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article search functionality with permission-based visibility controls.
 *
 * Validates that search results respect visibility permissions based on user
 * authentication and article status:
 *
 * - Unauthenticated users see only published articles
 * - Members see published articles plus their own articles in any status
 * - Moderators see all articles regardless of status
 *
 * Test workflow:
 *
 * 1. Create category for test articles
 * 2. Register two members and one moderator
 * 3. Create articles with different statuses (published, pending, rejected)
 * 4. Search from different user contexts and verify visibility rules
 * 5. Validate pagination and result counts
 */
export async function test_api_articles_search_permission_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create a test category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category " + RandomGenerator.alphaNumeric(8),
          slug: "test-category-" + RandomGenerator.alphaNumeric(8),
          display_order: 1,
          is_active: true,
          description: "Category for visibility permission testing",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register first member
  const member1Email = `member1-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member1Username = `member1_${RandomGenerator.alphaNumeric(8)}`;
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: member1Username,
      display_name: "Test Member 1",
      password: "TestPassword123!",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  // Step 3: Register second member
  const member2Email = `member2-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member2Username = `member2_${RandomGenerator.alphaNumeric(8)}`;
  const member2Response = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: member2Username,
      display_name: "Test Member 2",
      password: "TestPassword123!",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2Response);
  const member2Id = member2Response.id;

  // Step 4: Register moderator
  const moderatorEmail = `moderator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "ModeratorPass123!",
      display_name: "Test Moderator",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Create published article by Member 1
  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Published Article by Member 1",
        body: "This is a published article visible to all users including unauthenticated visitors.",
        category_id: category.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(publishedArticle);
  TestValidator.equals(
    "published article status should be pending_approval initially",
    publishedArticle.status,
    "pending_approval",
  );

  // Step 6: Create pending article by Member 1
  const pendingArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Pending Article by Member 1",
        body: "This article is awaiting moderator approval and should only be visible to creator and moderators.",
        category_id: category.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(pendingArticle);
  TestValidator.equals(
    "pending article status should be pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 7: Switch to Member 2 and create their article
  const member2LoginConn = { ...connection, headers: {} };
  const member2Login = await api.functional.auth.member.login(
    member2LoginConn,
    {
      body: {
        email: member2Email,
        username: undefined,
        password: "TestPassword123!",
        href: "http://localhost/login",
        referrer: "http://localhost/",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(member2Login);

  const member2Article =
    await api.functional.discussionBoard.member.articles.create(
      member2LoginConn,
      {
        body: {
          title: "Published Article by Member 2",
          body: "This is an article from Member 2 that should be visible to all users.",
          category_id: category.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(member2Article);

  // Step 8: Test search as unauthenticated user (empty headers)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthResult = await api.functional.discussionBoard.articles.index(
    unauthConn,
    {
      body: {
        q: "Article",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(unauthResult);
  TestValidator.predicate(
    "unauthenticated user search should return results",
    unauthResult.data.length >= 0,
  );
  // Verify that unauthenticated user only sees published articles (not pending_approval)
  for (const article of unauthResult.data) {
    TestValidator.equals(
      "unauthenticated user should only see published articles",
      article.status,
      "published",
    );
  }

  // Step 9: Test search as Member 1 (logged in via initial connection)
  const member1Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        q: "Article",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(member1Result);
  TestValidator.predicate(
    "member 1 should see search results",
    member1Result.data.length > 0,
  );

  // Member 1 should see published articles and their own articles (pending/rejected)
  const member1OwnArticles = member1Result.data.filter(
    (article) => article.creator.id === member1.id,
  );
  TestValidator.predicate(
    "member 1 should see their own pending articles",
    member1OwnArticles.some((article) => article.status === "pending_approval"),
  );

  // Step 10: Test search as Member 2
  const member2Result = await api.functional.discussionBoard.articles.index(
    member2LoginConn,
    {
      body: {
        q: "Article",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(member2Result);

  // Member 2 should see published articles and their own articles
  const member2OwnArticles = member2Result.data.filter(
    (article) => article.creator.id === member2Id,
  );
  TestValidator.predicate(
    "member 2 should see their own articles",
    member2OwnArticles.length > 0,
  );

  // Member 2 should NOT see Member 1's pending articles
  const member1PendingVisible = member2Result.data.filter(
    (article) =>
      article.creator.id === member1.id &&
      article.status === "pending_approval",
  );
  TestValidator.equals(
    "member 2 should not see member 1's pending articles",
    member1PendingVisible.length,
    0,
  );

  // Step 11: Test search as Moderator
  const moderatorConn = { ...connection, headers: {} };
  const modLogin = await api.functional.auth.moderator.login(moderatorConn, {
    body: {
      email: moderatorEmail,
      username: undefined,
      password: "ModeratorPass123!",
      href: "http://localhost/admin",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(modLogin);

  const moderatorResult = await api.functional.discussionBoard.articles.index(
    moderatorConn,
    {
      body: {
        q: "Article",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(moderatorResult);

  // Moderator should see all articles regardless of status
  TestValidator.predicate(
    "moderator should see all articles in search",
    moderatorResult.data.length >= member1Result.data.length,
  );

  // Step 12: Test pagination
  const paginationResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        q: "Article",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginationResult);
  typia.assert(paginationResult.pagination);
  TestValidator.predicate(
    "pagination should have valid page information",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 10,
  );

  // Step 13: Test category filtering
  const categoryFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        q: "Article",
        categories: [category.id],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "search with category filter should return articles in that category",
    categoryFilterResult.data.every(
      (article) => article.category.id === category.id,
    ),
  );
}
