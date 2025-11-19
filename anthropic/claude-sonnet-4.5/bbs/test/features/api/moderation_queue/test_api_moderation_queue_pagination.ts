import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test moderation queue pagination functionality.
 *
 * This test validates that moderators can efficiently navigate through large
 * numbers of content reports using pagination. It tests page navigation, custom
 * limit values, pagination metadata accuracy, and maximum limit enforcement.
 *
 * Test Flow:
 *
 * 1. Create moderator and member accounts
 * 2. Create article categories
 * 3. Create multiple articles (50+)
 * 4. Submit content reports for all articles
 * 5. Test pagination with different page numbers and limits
 * 6. Validate pagination metadata and response consistency
 */
export async function test_api_moderation_queue_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for accessing moderation queue
  const moderatorEmail = `moderator${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const categoryData = {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General discussion category for testing",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple member accounts to submit reports
  const memberCount = 5;
  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const memberEmail = `member${RandomGenerator.alphaNumeric(8)}@test.com`;
    const memberPassword = RandomGenerator.alphaNumeric(12);

    const memberBody = {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
    typia.assert(member);

    return { email: memberEmail, password: memberPassword, data: member };
  });

  // Step 4: Create 55 articles to ensure we have enough for pagination testing
  const articleCount = 55;
  const articles = await ArrayUtil.asyncRepeat(articleCount, async (index) => {
    // Switch to first member for article creation
    await api.functional.auth.member.login(connection, {
      body: {
        email: members[0].email,
        password: members[0].password,
        ip: "127.0.0.1",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const articleBody = {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 3 }),
      discussion_board_article_category_id: category.id,
      status: "published" as const,
    } satisfies IDiscussionBoardArticle.ICreate;

    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
    typia.assert(article);

    return article;
  });

  // Step 5: Submit content reports for all articles
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  for (let i = 0; i < articles.length; i++) {
    const memberIndex = i % memberCount;
    const member = members[memberIndex];

    await api.functional.auth.member.login(connection, {
      body: {
        email: member.email,
        password: member.password,
        ip: "127.0.0.1",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const reportBody = {
      discussion_board_article_id: articles[i].id,
      report_category: RandomGenerator.pick(reportCategories),
      report_details: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardContentReport.ICreate;

    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
  }

  // Step 6: Switch to moderator to access moderation queue
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test 1: Default pagination (page 1, default limit 20)
  const defaultPage =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(defaultPage);

  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "default page records",
    defaultPage.pagination.records,
    articleCount,
  );
  TestValidator.predicate(
    "default page has data",
    defaultPage.data.length === 20,
  );

  // Test 2: Custom page size (limit 10)
  const page1Limit10 =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "limit 10 current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 10 page limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "limit 10 data length",
    page1Limit10.data.length === 10,
  );

  // Test 3: Page navigation (page 2 vs page 1)
  const page2Limit10 =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page2Limit10);

  TestValidator.equals("page 2 current", page2Limit10.pagination.current, 2);
  TestValidator.predicate(
    "page 2 data length",
    page2Limit10.data.length === 10,
  );

  // Verify page 1 and page 2 return different reports
  const page1Ids = page1Limit10.data.map((r) => r.id);
  const page2Ids = page2Limit10.data.map((r) => r.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("page 1 and 2 have different reports", !hasOverlap);

  // Test 4: Larger page size (limit 50)
  const page1Limit50 =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1Limit50);

  TestValidator.equals(
    "limit 50 current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 50 page limit",
    page1Limit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "limit 50 data length",
    page1Limit50.data.length === 50,
  );

  // Test 5: Maximum limit enforcement (100)
  const page1Limit100 =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1Limit100);

  TestValidator.equals(
    "limit 100 current page",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100 page limit",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 respects max",
    page1Limit100.data.length <= 100,
  );

  // Test 6: Total pages calculation
  const calculatedPages = Math.ceil(articleCount / 20);
  TestValidator.equals(
    "total pages calculation",
    defaultPage.pagination.pages,
    calculatedPages,
  );

  // Test 7: Last page validation
  const lastPageNumber = Math.ceil(articleCount / 10);
  const lastPage =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          page: lastPageNumber,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(lastPage);

  const expectedLastPageItems = articleCount % 10 || 10;
  TestValidator.predicate(
    "last page has correct items",
    lastPage.data.length === expectedLastPageItems,
  );
}
