import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_attachment_retrieval_nonexistent_article(
  connection: api.IConnection,
) {
  // Create a valid article to establish proper user context and system state
  const validArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph(),
        content: RandomGenerator.content(),
        category: "Economic Policy",
        econ_political_discussion_user_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(validArticle);

  // Generate a UUID that definitely doesn't exist in the system
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Test that retrieving attachments for a non-existent article properly fails
  await TestValidator.error(
    "retrieving attachments for non-existent article should throw error",
    async () => {
      await api.functional.econPoliticalDiscussion.articles.attachments.getByArticleid(
        connection,
        {
          articleId: nonExistentArticleId,
        },
      );
    },
  );

  // Validate the created article is properly established
  TestValidator.equals(
    "valid article creation confirmed",
    validArticle.id,
    validArticle.id,
  );

  TestValidator.predicate(
    "article has required properties",
    validArticle.title.length > 0 &&
      validArticle.content.length > 0 &&
      validArticle.category.length > 0,
  );
}
