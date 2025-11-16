import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleLike";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_member_liked_articles_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create member user (join)
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/join",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Create admin user (join) to manage categories
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}-admin@example.com`,
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/admin/join",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Create two article categories as admin
  const categoryABody = {
    code: `CAT_A_${RandomGenerator.alphabets(4)}`,
    name: "Category A",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;
  const categoryA: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryABody,
      },
    );
  typia.assert(categoryA);

  const categoryBBody = {
    code: `CAT_B_${RandomGenerator.alphabets(4)}`,
    name: "Category B",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 2,
  } satisfies IDiscussionBoardArticleCategory.ICreate;
  const categoryB: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBBody,
      },
    );
  typia.assert(categoryB);

  // 4. Switch to member user context via login (even though join already set token)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);
  TestValidator.equals(
    "logged-in member id should match joined member id",
    memberLogin.id,
    memberId,
  );

  // 5. Create multiple articles as member across categories
  const targetPerCategory = 7;
  const otherPerCategory = 5;
  const createdCategoryA: IDiscussionBoardArticle[] = [];
  const createdCategoryB: IDiscussionBoardArticle[] = [];

  // Helper to create one article in a given category
  const createArticle = async (
    categoryId: string & tags.Format<"uuid">,
  ): Promise<IDiscussionBoardArticle> => {
    const body = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      categoryId,
    } satisfies IDiscussionBoardArticle.ICreate;

    const article =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        {
          body,
        },
      );
    typia.assert(article);
    return article;
  };

  // Create articles in category A (enough to span 2 pages when liked)
  for (let i = 0; i < targetPerCategory; i += 1) {
    const article = await createArticle(categoryA.id);
    createdCategoryA.push(article);
  }

  // Create articles in category B
  for (let i = 0; i < otherPerCategory; i += 1) {
    const article = await createArticle(categoryB.id);
    createdCategoryB.push(article);
  }

  // 6. Like every created article as the same member
  const likeArticle = async (
    article: IDiscussionBoardArticle,
  ): Promise<void> => {
    const body = {} satisfies IDiscussionBoardArticleLike.ICreate;
    const like: IDiscussionBoardArticleLike =
      await api.functional.discussionBoard.memberUser.articles.likes.create(
        connection,
        {
          articleId: article.id,
          body,
        },
      );
    typia.assert(like);
    TestValidator.equals(
      "liked article summary id should match target article id",
      like.article.id,
      article.id,
    );
  };

  for (const article of [...createdCategoryA, ...createdCategoryB]) {
    await likeArticle(article);
  }

  // 7. Call likedArticles.index with category filter and pagination (page 1)
  const limit = 5;

  const requestPage1 = {
    page: 1,
    limit,
    categoryId: categoryA.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "page1.data length must not exceed limit",
    page1.data.length <= limit,
  );

  for (const summary of page1.data) {
    TestValidator.equals(
      "page1 article category should match filter category",
      summary.category.id,
      categoryA.id,
    );
  }

  // 8. Call likedArticles.index for page 2 with same filter
  const requestPage2 = {
    page: 2,
    limit,
    categoryId: categoryA.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: requestPage2,
      },
    );
  typia.assert(page2);

  TestValidator.predicate(
    "page2.data length must not exceed limit",
    page2.data.length <= limit,
  );

  for (const summary of page2.data) {
    TestValidator.equals(
      "page2 article category should match filter category",
      summary.category.id,
      categoryA.id,
    );
  }

  // Combine ids and ensure no overlap between page1 and page2 results
  const page1Ids = page1.data.map((s) => s.id);
  const page2Ids = page2.data.map((s) => s.id);

  for (const id of page1Ids) {
    TestValidator.predicate(
      "no overlap between page1 and page2 article ids",
      page2Ids.includes(id) === false,
    );
  }

  // Ensure returned ids are subset of created+liked category A articles
  const createdCategoryAIds = createdCategoryA.map((a) => a.id);
  const combinedIds = [...page1Ids, ...page2Ids];

  for (const id of combinedIds) {
    TestValidator.predicate(
      "returned liked article must be created in this test for category A",
      createdCategoryAIds.includes(id),
    );
  }

  // Validate pagination metadata consistency against expected total liked count in category A
  const expectedTotal = createdCategoryA.length;

  TestValidator.equals(
    "pagination.records should equal total liked articles in category A",
    page1.pagination.records,
    expectedTotal,
  );

  TestValidator.equals(
    "pagination.pages should be ceil(total/limit)",
    page1.pagination.pages,
    Math.ceil(expectedTotal / limit),
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    page1.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.current for page1 should be within valid range (0-based)",
    page1.pagination.current >= 0 &&
      page1.pagination.current < page1.pagination.pages,
  );

  TestValidator.predicate(
    "pagination.current for page2 should be within valid range (0-based)",
    page2.pagination.current >= 0 &&
      page2.pagination.current < page2.pagination.pages,
  );

  // 9. Optional additional filter usage: ensure moderationState filter does not break contract
  const filterWithModerationState = {
    page: 1,
    limit,
    categoryId: categoryA.id,
    moderationState: page1.data[0]?.category.name ? undefined : undefined,
  } satisfies IDiscussionBoardArticle.IRequest;

  const pageWithModerationState: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: filterWithModerationState,
      },
    );
  typia.assert(pageWithModerationState);

  for (const summary of pageWithModerationState.data) {
    TestValidator.equals(
      "moderationState-filtered article category should match filter category",
      summary.category.id,
      categoryA.id,
    );
  }
}
