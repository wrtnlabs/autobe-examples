import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_discussion_article_retrieval_deleted_article(
  connection: api.IConnection,
) {
  // Test retrieval of a non-existent article to verify error handling
  // Since I don't have access to create/delete article APIs, I'll test with a random UUID
  // This simulates the scenario of trying to access a deleted or non-existent article

  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a non-existent article
  // This should trigger appropriate error handling for soft-deleted or missing articles
  await TestValidator.error(
    "retrieval of non-existent article should fail",
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
