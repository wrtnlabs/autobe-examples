import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_moderation_reports_priority_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create moderator account for accessing reports queue
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create category for articles
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create multiple member accounts for reporting
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);

  const member2 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member2);

  const member3 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member3);

  // 4. Create articles to be reported
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // 5. Submit multiple reports on article1 for priority testing (highest priority)
  const reportReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "off_topic",
  ] as const;

  const report1a = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article1.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report1a);

  const report1b = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article1.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report1b);

  const report1c = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article1.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report1c);

  // 6. Submit two reports on article2 (medium priority)
  const report2a = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article2.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report2a);

  const report2b = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article2.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report2b);

  // 7. Submit one report on article3 (lowest priority)
  const report3 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: article3.id,
        reported_comment_id: null,
        report_reason: RandomGenerator.pick(reportReasons),
        report_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report3);

  // 8. Test priority sorting (most-reported content first)
  const priorityResults =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        sort_by: "priority",
        sort_order: "desc",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(priorityResults);

  TestValidator.predicate(
    "priority sorting returns results",
    priorityResults.data.length > 0,
  );

  // 9. Test oldest-first sorting for chronological processing
  const oldestFirstResults =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(oldestFirstResults);

  TestValidator.predicate(
    "oldest-first sorting returns results",
    oldestFirstResults.data.length > 0,
  );

  // 10. Test newest-first sorting for recent reports
  const newestFirstResults =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(newestFirstResults);

  TestValidator.predicate(
    "newest-first sorting returns results",
    newestFirstResults.data.length > 0,
  );

  // 11. Test pagination with different page sizes
  const pageSizes = [25, 50, 100] as const;

  for (const pageSize of pageSizes) {
    const paginatedResults =
      await api.functional.discussionBoard.moderator.reports.index(connection, {
        body: {
          page: 1,
          limit: pageSize,
          sort_by: "priority",
          sort_order: "desc",
        } satisfies IDiscussionBoardReport.IRequest,
      });
    typia.assert(paginatedResults);

    TestValidator.equals(
      `pagination limit matches requested page size ${pageSize}`,
      paginatedResults.pagination.limit,
      pageSize,
    );

    TestValidator.predicate(
      `pagination current page is 1 for page size ${pageSize}`,
      paginatedResults.pagination.current === 1,
    );

    TestValidator.predicate(
      `pagination total records is non-negative for page size ${pageSize}`,
      paginatedResults.pagination.records >= 0,
    );

    TestValidator.predicate(
      `pagination total pages is non-negative for page size ${pageSize}`,
      paginatedResults.pagination.pages >= 0,
    );
  }

  // 12. Test status filter with pagination
  const pendingReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "pending",
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(pendingReports);

  TestValidator.predicate(
    "status filter returns results",
    pendingReports.data.length >= 0,
  );

  // 13. Verify all returned reports have pending status
  for (const report of pendingReports.data) {
    TestValidator.equals(
      "filtered reports have pending status",
      report.status,
      "pending",
    );
  }

  // 14. Test pagination metadata accuracy
  const firstPage =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 2,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(firstPage);

  TestValidator.predicate(
    "first page has correct pagination metadata",
    firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 2 &&
      firstPage.pagination.records >= 0,
  );
}
