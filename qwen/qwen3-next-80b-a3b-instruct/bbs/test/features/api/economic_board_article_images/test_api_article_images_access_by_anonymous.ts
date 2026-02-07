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

export async function test_api_article_images_access_by_anonymous(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for an article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint to retrieve images for the article
  const imagesResponse =
    await api.functional.economicBoard.articles.images.index(connection, {
      articleId,
    });
  // Complete runtime type validation — ensures pagination, data, and all nested properties exist and are correctly typed
  typia.assert(imagesResponse);
}
