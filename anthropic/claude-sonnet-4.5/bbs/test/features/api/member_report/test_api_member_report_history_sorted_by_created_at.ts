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
 * Test sorting member report history by submission timestamp.
 *
 * This test validates that the member report history API correctly sorts
 * reports by their creation timestamp (created_at field) in both ascending and
 * descending order.
 *
 * Test Flow:
 *
 * 1. Create moderator account for report retrieval access
 * 2. Create article categories for test infrastructure
 * 3. Create member account who will submit reports
 * 4. Create multiple articles as report targets
 * 5. Submit multiple reports at different times with delays between submissions
 * 6. Retrieve reports sorted by created_at ascending (oldest first)
 * 7. Validate reports are in chronological order
 * 8. Retrieve reports sorted by created_at descending (newest first)
 * 9. Validate reports are in reverse chronological order
 */
export async function test_api_member_report_history_sorted_by_created_at(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
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
          description: "Category for testing report sorting",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account who will submit reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple articles as report targets
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
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

  // Step 5: Submit multiple reports at different times with delays
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const submittedReports: IDiscussionBoardContentReport[] = [];

  for (let i = 0; i < 3; i++) {
    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[i].id,
          body: {
            discussion_board_article_id: articles[i].id,
            report_category: reportCategories[i],
            report_details: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    submittedReports.push(report);

    // Add delay between submissions to ensure distinct created_at timestamps
    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 6: Switch back to moderator and retrieve reports sorted ascending
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: "moderator123!",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const ascendingResult =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 7: Validate ascending order (oldest first)
  TestValidator.equals(
    "ascending sort should return all reports",
    ascendingResult.data.length,
    3,
  );

  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const currentTimestamp = new Date(
      ascendingResult.data[i].created_at,
    ).getTime();
    const nextTimestamp = new Date(
      ascendingResult.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "reports should be in ascending chronological order",
      currentTimestamp <= nextTimestamp,
    );
  }

  // Step 8: Retrieve reports sorted descending
  const descendingResult =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 9: Validate descending order (newest first)
  TestValidator.equals(
    "descending sort should return all reports",
    descendingResult.data.length,
    3,
  );

  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const currentTimestamp = new Date(
      descendingResult.data[i].created_at,
    ).getTime();
    const nextTimestamp = new Date(
      descendingResult.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "reports should be in descending chronological order",
      currentTimestamp >= nextTimestamp,
    );
  }

  // Validate that ascending and descending results are reverse of each other
  const ascendingIds = ascendingResult.data.map((r) => r.id);
  const descendingIds = descendingResult.data.map((r) => r.id);
  TestValidator.equals(
    "ascending and descending should contain same reports in reverse order",
    [...ascendingIds].reverse(),
    descendingIds,
  );
}
