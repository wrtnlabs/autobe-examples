import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_image_download_success(
  connection: api.IConnection,
): Promise<void> {
  // Test downloading a specific article image
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const image = await api.functional.discussionBoard.articles.images.at(
    connection,
    {
      articleId,
      imageId,
    },
  );
  typia.assert(image);
}
