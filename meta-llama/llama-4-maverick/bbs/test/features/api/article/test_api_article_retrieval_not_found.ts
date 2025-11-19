import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

export async function test_api_article_retrieval_not_found(
  connection: api.IConnection,
) {
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieving non-existent article should return 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      }),
  );
}
