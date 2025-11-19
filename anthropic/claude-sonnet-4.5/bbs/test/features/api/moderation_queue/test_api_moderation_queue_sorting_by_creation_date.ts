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
 * Test moderation queue sorting by report submission timestamp to enable
 * priority-based moderation workflows.
 *
 * This test validates the sort_by=created_at parameter combined with order
 * (asc/desc) to control result ordering. The test creates multiple content
 * reports at different times and verifies that sorting by created_at with
 * order=asc returns oldest reports first (default behavior for prioritizing
 * urgent pending reports), while order=desc returns newest reports first. This
 * validates that moderators can customize their queue view based on workflow
 * preferences - ascending order surfaces the oldest pending reports requiring
 * immediate attention to ensure timely moderation response, while descending
 * order may be useful for reviewing recent reporting trends.
 *
 * Test workflow:
 *
 * 1. Create moderator account for accessing moderation queue
 * 2. Create multiple member accounts for submitting reports
 * 3. Create article category for test articles
 * 4. Create multiple articles to be reported
 * 5. Submit content reports with time delays to establish temporal ordering
 * 6. Query moderation queue with sort_by=created_at, order=asc and verify
 *    oldest-first ordering
 * 7. Query moderation queue with sort_by=created_at, order=desc and verify
 *    newest-first ordering
 * 8. Validate that timestamps are properly ordered in both cases
 */
export async function test_api_moderation_queue_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for accessing moderation queue
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple member accounts and articles for reporting
  const reportCount = 5;
  const members: IDiscussionBoardMember.IAuthorized[] = [];
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < reportCount; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.name(1) + i,
        display_name: RandomGenerator.name(2),
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    members.push(member);

    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // Step 4: Submit content reports with time delays to establish temporal ordering
  const reports: IDiscussionBoardContentReport[] = [];
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  for (let i = 0; i < reportCount; i++) {
    const loginResult = await api.functional.auth.member.login(connection, {
      body: {
        email: members[i].email,
        password: "member123",
        href: "https://example.com/member/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });
    typia.assert(loginResult);

    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: articles[i].id,
            report_category: reportCategories[i],
            report_details: `Report details for article ${i}`,
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);

    if (i < reportCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 5: Switch to moderator account
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // Step 6: Query moderation queue with sort_by=created_at, order=asc (oldest first)
  const ascendingResult =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(ascendingResult);

  TestValidator.predicate(
    "ascending result should contain all reports",
    ascendingResult.data.length >= reportCount,
  );

  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = new Date(ascendingResult.data[i].created_at).getTime();
    const next = new Date(ascendingResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `ascending order: report ${i} created_at should be <= report ${i + 1} created_at`,
      current <= next,
    );
  }

  // Step 7: Query moderation queue with sort_by=created_at, order=desc (newest first)
  const descendingResult =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(descendingResult);

  TestValidator.predicate(
    "descending result should contain all reports",
    descendingResult.data.length >= reportCount,
  );

  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = new Date(descendingResult.data[i].created_at).getTime();
    const next = new Date(descendingResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `descending order: report ${i} created_at should be >= report ${i + 1} created_at`,
      current >= next,
    );
  }

  // Step 8: Verify that first report in ascending is oldest and first in descending is newest
  if (ascendingResult.data.length > 0 && descendingResult.data.length > 0) {
    const oldestTimestamp = new Date(
      ascendingResult.data[0].created_at,
    ).getTime();
    const newestTimestamp = new Date(
      descendingResult.data[0].created_at,
    ).getTime();
    TestValidator.predicate(
      "oldest report timestamp should be <= newest report timestamp",
      oldestTimestamp <= newestTimestamp,
    );
  }
}
