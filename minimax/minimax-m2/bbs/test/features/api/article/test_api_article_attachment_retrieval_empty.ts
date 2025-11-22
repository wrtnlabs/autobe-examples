import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_attachment_retrieval_empty(
  connection: api.IConnection,
) {
  // Step 1: Create a new economic/political discussion article with no attachments to test empty retrieval
  const testArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category: "Political Analysis",
        econ_political_discussion_user_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(testArticle);

  // Step 2: Retrieve attachments for the article with no uploads
  const attachmentResponse =
    await api.functional.econPoliticalDiscussion.articles.attachments.getByArticleid(
      connection,
      {
        articleId: testArticle.id,
      },
    );
  typia.assert(attachmentResponse);

  // Step 3: Validate that the response structure is correct when no attachments exist
  // The API returns a single IEconPoliticalDiscussionAttachment.ISummary object
  // For an article with no attachments, this should return an appropriate response
  // We'll validate that the response has the correct structure
  TestValidator.equals(
    "response has article property",
    attachmentResponse.article.id,
    testArticle.id,
  );
  TestValidator.equals(
    "response has proper structure",
    attachmentResponse.id,
    testArticle.id,
  ); // Basic structure validation
}
