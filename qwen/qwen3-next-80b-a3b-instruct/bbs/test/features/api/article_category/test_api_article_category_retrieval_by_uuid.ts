import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
export async function test_api_article_category_retrieval_by_uuid(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for category retrieval
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve the category
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.articles.categories.at(connection, {
      categoryId,
    });
  // Validate the response structure and types
  typia.assert(category);
}
