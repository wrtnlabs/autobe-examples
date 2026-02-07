import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_images_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Call the only available endpoint with valid UUID
  const result = await api.functional.economicBoard.articles.images.index(
    connection,
    {
      articleId: articleId,
    },
  );
  // Validate response structure matches provided DTO
  typia.assert(result);
  // Verify pagination structure
  TestValidator.predicate("pagination defined", result.pagination !== null);
  TestValidator.predicate(
    "pagination current is greater than or equal to 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is greater than 0",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is greater than or equal to 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is greater than or equal to 0",
    result.pagination.pages >= 0,
  );
  // Verify data structure
  TestValidator.predicate("data array defined", Array.isArray(result.data));
  // No property validation on image objects since IEconomicBoardArticleImage.ISummary is empty and has no properties
}
