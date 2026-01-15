import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReport";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_report } from "../../../prepare/prepare_random_discussion_board_report";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_reports_create } from "../../../generate/generate_random_discussion_board_citizen_articles_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member user to establish authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create an article to be reported
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Submit a report against the created article
  const createdReport: IDiscussionBoardReport =
    await generate_random_discussion_board_citizen_articles_reports_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          report_type: "harassment",
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          target_content_type: "article"  // Added missing required property
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
  typia.assert(createdReport);
  // Step 4: Retrieve the article report using the articleId and reportId
  // According to the API spec, no authentication is required for this read-only operation.
  // Use the base connection to test unauthenticated access.
  const retrievedReport: IDiscussionBoardArticleReport =
    await api.functional.discussionBoard.articles.reports.at(connection, {
      articleId: article.id,
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);
  // Step 5: Validate the retrieved report contains correct reporter, reason, status, and timestamp
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    member.displayName,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    createdReport.description,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report created_at matches",
    retrievedReport.created_at,
    createdReport.created_at,
  );
  // Step 6: Validate that the article summary in the report matches the created article
  TestValidator.equals(
    "reported article ID matches",
    retrievedReport.article.id,
    article.id,
  );
  TestValidator.equals(
    "reported article title matches",
    retrievedReport.article.title,
    article.title satisfies string as string,  // Stripped Typia tags to match target type
  );
  TestValidator.equals(
    "reported article status matches",
    retrievedReport.article.status,
    article.status,
  );
}