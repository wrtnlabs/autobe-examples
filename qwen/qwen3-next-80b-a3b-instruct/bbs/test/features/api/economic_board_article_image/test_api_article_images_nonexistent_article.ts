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

export async function test_api_article_images_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID that does not correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // 2. Call the endpoint to retrieve images for the non-existent article
  const response = await api.functional.economicBoard.articles.images.index(
    connection,
    {
      articleId: nonExistentArticleId,
    },
  );
  // 3. Validate response structure and content
  typia.assert(response);
  // 4. Verify that the response has empty pagination and empty data array
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 30",
    response.pagination.limit,
    30,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data should be empty array", response.data.length, 0);
}
