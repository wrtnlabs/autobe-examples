import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleMonthlyStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMonthlyStats";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleMonthlyStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleMonthlyStats";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_discussion_board_analytics_articles_monthly_after_article_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authorize member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/auth`,
      referrer: `https://example.com/signup`,
      ip: null,
    },
  });
  // Create a discussion board article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 8,
          wordMax: 12,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Get the monthly analytics report
  const analytics =
    await api.functional.discussionBoard.analytics.articles.monthly.index(
      memberConnection,
    );
  typia.assert(analytics);
  // Validate that the article appears in the analytics for the creation month
  // Get the month from article creation timestamp
  const createdAtDate = new Date(article.createdAt);
  const monthStart = new Date(
    createdAtDate.getFullYear(),
    createdAtDate.getMonth(),
    1,
  );
  const monthEnd = new Date(
    createdAtDate.getFullYear(),
    createdAtDate.getMonth() + 1,
    1,
  );
  // Find the analytics month entry for the article's creation month
  const analyticsMonth = analytics.data.find((month) => {
    const monthDate = new Date(month.month + "/" + "01");
    return (
      monthDate.getTime() >= monthStart.getTime() &&
      monthDate.getTime() <= monthEnd.getTime()
    );
  });
  // Check that analyticsMonth is defined before accessing its properties
  if (analyticsMonth) {
    // Validate the article count for the month matches expected count
    TestValidator.equals(
      "analytics report contains the correct month for article creation",
      analyticsMonth,
      analytics.data.find((month) => {
        const monthDate = new Date(month.month + "/" + "01");
        return (
          monthDate.getTime() >= monthStart.getTime() &&
          monthDate.getTime() <= monthEnd.getTime()
        );
      }),
    );
    TestValidator.equals(
      "article count for creation month is 1 (the article we created)",
      analyticsMonth.articleCount,
      1,
    );
    TestValidator.equals(
      "article count should be at least 1",
      analyticsMonth.articleCount,
      1,
      (key) => key !== "engagementScore",
    );
  }
}