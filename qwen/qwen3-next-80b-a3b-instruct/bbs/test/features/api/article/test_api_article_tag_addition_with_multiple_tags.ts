import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_tag_addition_with_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // Use a random UUID for article ID - assumes artifact exists and requester is authorized
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple tag inputs
  const tagsToCreate = [
    "ECONOMIC-THEORY", // Uppercase for normalization test
    "market-dynamics", // lowercase normal
    "policy-analysis", // lowercase normal
    "MARKET-DYNAMICS", // Duplicate, should be removed
    "economic-theory", // Duplicate, should be removed
  ] satisfies IEconomicBoardArticle.ITagsCreate;
  // Call the tag addition endpoint
  const response =
    await api.functional.economicBoard.articles.tags.postByArticleid(
      connection,
      {
        articleId,
        body: tagsToCreate,
      },
    );
  typia.assert(response);
  // Cast response to string array based on API contract
  typia.assertGuard(response);
  const tagArray = response as string[];
  // Validate response contains exactly 3 unique, normalized, alphabetically sorted tags
  TestValidator.equals("tag count", tagArray.length, 3);
  TestValidator.equals("first tag", tagArray[0], "economic-theory");
  TestValidator.equals("second tag", tagArray[1], "market-dynamics");
  TestValidator.equals("third tag", tagArray[2], "policy-analysis");
  // Validate tags are sorted alphabetically
  const sortedTags = [...tagsToCreate]
    .map((tag) => tag.toLowerCase())
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx)
    .sort();
  TestValidator.equals("tags sorted", tagArray, sortedTags);
}
