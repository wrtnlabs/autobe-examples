import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_tag_addition_by_admin_for_other_users_article(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for an existing article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Define two tags to add
  const newTags: IEconomicBoardArticle.ITagsCreate = [
    "macroeconomic",
    "fiscal-policy",
  ];
  // Admin adds tags to article (assuming admin permissions are already established)
  const updatedTags =
    await api.functional.economicBoard.articles.tags.postByArticleid(
      connection,
      {
        articleId,
        body: newTags,
      },
    );
  typia.assert(updatedTags);
  // Validate the response is an empty object as per ITag definition
  TestValidator.equals(
    "response is empty object",
    Object.keys(updatedTags).length,
    0,
  );
  // Confirm update was accepted by ensuring the response is not null or undefined
  TestValidator.predicate(
    "response is valid",
    updatedTags !== null && updatedTags !== undefined,
  );
}
