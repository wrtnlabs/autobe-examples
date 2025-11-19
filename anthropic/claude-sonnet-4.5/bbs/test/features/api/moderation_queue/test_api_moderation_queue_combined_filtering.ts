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
 * Test moderation queue with multiple filters combined to create highly
 * specific queries for specialized moderation workflows.
 *
 * This test validates that moderators can combine multiple filter parameters
 * (status, report_category, date ranges, sorting) simultaneously to create
 * focused work queues like 'pending misinformation reports from the last week
 * sorted by oldest first'.
 *
 * The test creates a diverse set of content reports with varying statuses,
 * categories, and timestamps, then applies multiple filters together to verify
 * that all filter criteria are properly combined with AND logic. For example,
 * filtering for status=pending AND report_category=Misinformation AND
 * created_at_from=[last week] should return only pending misinformation reports
 * from the past week, excluding resolved reports, other categories, and older
 * reports.
 *
 * This validates the sophisticated filtering capabilities that enable
 * moderators to create customized workflows based on their expertise and
 * organizational priorities. The test also verifies that pagination works
 * properly with combined filters.
 */
export async function test_api_moderation_queue_combined_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for resolving reports
  const resolvingModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: "https://discussion.example.com/moderator/join",
        referrer: "https://discussion.example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(resolvingModerator);

  // Step 2: Create testing moderator account
  const testingModeratorEmail = typia.random<string & tags.Format<"email">>();
  const testingModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: testingModeratorEmail,
        password: "moderator456!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.101",
        href: "https://discussion.example.com/moderator/join",
        referrer: "https://discussion.example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(testingModerator);

  // Step 3: Create member accounts for submitting reports
  const members = await ArrayUtil.asyncRepeat(3, async () => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.50",
        href: "https://discussion.example.com/join",
        referrer: "https://discussion.example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 4: Create article categories
  const categories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: `Category ${index + 1}`,
            slug: `category-${index + 1}`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: index + 1,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 5: Create articles across different categories
  const articles: IDiscussionBoardArticle[] = [];
  for (const member of members) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: member.email,
        password: "member123!",
        ip: "192.168.1.50",
        href: "https://discussion.example.com/login",
        referrer: "https://discussion.example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const memberArticles = await ArrayUtil.asyncRepeat(2, async () => {
      const article =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: {
              title: RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 5,
                wordMax: 10,
              }),
              body: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 10,
                sentenceMax: 20,
              }),
              discussion_board_article_category_id:
                RandomGenerator.pick(categories).id,
              status: "published",
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    });
    articles.push(...memberArticles);
  }

  // Step 6: Create diverse reports with different statuses, categories, and timestamps
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allReports: IDiscussionBoardContentReport[] = [];

  // Create 20 reports with diverse attributes
  for (let i = 0; i < 20; i++) {
    const reportingMember = RandomGenerator.pick(members);
    await api.functional.auth.member.login(connection, {
      body: {
        email: reportingMember.email,
        password: "member123!",
        ip: "192.168.1.50",
        href: "https://discussion.example.com/login",
        referrer: "https://discussion.example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: RandomGenerator.pick(articles).id,
            report_category: RandomGenerator.pick(reportCategories),
            report_details: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    allReports.push(report);
  }

  // Step 7: Resolve some reports to create status diversity
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: resolvingModerator.email,
      password: "moderator123!",
      ip: "192.168.1.100",
      href: "https://discussion.example.com/moderator/login",
      referrer: "https://discussion.example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const resolutionStatuses = [
    "reviewed_no_action",
    "reviewed_edited",
    "reviewed_removed",
  ] as const;

  // Resolve 10 random reports - FIXED: Added await
  for (let i = 0; i < 10; i++) {
    const reportToResolve = allReports[i];
    await api.functional.discussionBoard.moderator.contentReports.update(
      connection,
      {
        reportId: reportToResolve.id,
        body: {
          status: RandomGenerator.pick(resolutionStatuses),
          resolution_notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  }

  // Step 8: Switch to testing moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: testingModeratorEmail,
      password: "moderator456!",
      ip: "192.168.1.101",
      href: "https://discussion.example.com/moderator/login",
      referrer: "https://discussion.example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 9: Test combined filtering - Status only (baseline)
  const pendingOnly =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingOnly);

  TestValidator.predicate(
    "pending filter returns only pending reports",
    pendingOnly.data.every((r) => r.status === "pending"),
  );

  // Step 10: Test combined filtering - Status + Category
  const pendingMisinformation =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "pending",
          report_category: "Misinformation",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingMisinformation);

  TestValidator.predicate(
    "combined status and category filter returns only pending misinformation reports",
    pendingMisinformation.data.every(
      (r) => r.status === "pending" && r.report_category === "Misinformation",
    ),
  );

  TestValidator.predicate(
    "combined filters narrow results compared to single filter",
    pendingMisinformation.pagination.records <= pendingOnly.pagination.records,
  );

  // Step 11: Test combined filtering - Status + Category + Date range
  const weekAgoISO = oneWeekAgo.toISOString();
  const nowISO = now.toISOString();

  const pendingMisinformationRecent =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "pending",
          report_category: "Misinformation",
          created_at_from: weekAgoISO,
          created_at_to: nowISO,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingMisinformationRecent);

  TestValidator.predicate(
    "combined status, category, and date range filter returns correct results",
    pendingMisinformationRecent.data.every((r) => {
      const createdAt = new Date(r.created_at);
      return (
        r.status === "pending" &&
        r.report_category === "Misinformation" &&
        createdAt >= oneWeekAgo &&
        createdAt <= now
      );
    }),
  );

  // Step 12: Test combined filtering with sorting (oldest first)
  const pendingSpamOldestFirst =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "pending",
          report_category: "Spam",
          sort_by: "created_at",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingSpamOldestFirst);

  TestValidator.predicate(
    "combined filters with sorting returns only matching reports",
    pendingSpamOldestFirst.data.every(
      (r) => r.status === "pending" && r.report_category === "Spam",
    ),
  );

  if (pendingSpamOldestFirst.data.length > 1) {
    TestValidator.predicate(
      "sorting by oldest first is applied correctly",
      (() => {
        for (let i = 0; i < pendingSpamOldestFirst.data.length - 1; i++) {
          const current = new Date(pendingSpamOldestFirst.data[i].created_at);
          const next = new Date(pendingSpamOldestFirst.data[i + 1].created_at);
          if (current > next) return false;
        }
        return true;
      })(),
    );
  }

  // Step 13: Test resolved reports filtering
  const resolvedReports =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "reviewed_no_action",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(resolvedReports);

  TestValidator.predicate(
    "resolved status filter excludes pending reports",
    resolvedReports.data.every((r) => r.status === "reviewed_no_action"),
  );

  // Step 14: Test pagination with combined filters
  const page1 =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1);

  if (page1.pagination.records > 5) {
    const page2 =
      await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
        connection,
        {
          body: {
            status: "pending",
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(page2);

    TestValidator.predicate(
      "pagination works with combined filters",
      page1.data.length <= 5 && page2.data.length <= 5,
    );

    TestValidator.predicate(
      "paginated results do not overlap",
      !page1.data.some((r1) => page2.data.some((r2) => r1.id === r2.id)),
    );
  }

  // Step 15: Test multiple category filtering with Off-Topic
  const offTopicReports =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          report_category: "Off-Topic",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(offTopicReports);

  TestValidator.predicate(
    "category filter returns only reports of specified category",
    offTopicReports.data.every((r) => r.report_category === "Off-Topic"),
  );
}
