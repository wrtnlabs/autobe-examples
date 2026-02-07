import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardFileAttachmentOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardFileAttachmentOfAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardFileAttachmentOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardFileAttachmentOfAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_article_files_empty_attachment_list(
  connection: api.IConnection,
): Promise<void> {
  // Create an article without any file attachments using the utility function
  const article = await generate_random_economic_board_articles_create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    },
  );
  typia.assertGuard(article);
  // Extract the article ID by type assertion to IEntity which correctly defines the id property
  const articleId = (article as IEntity).id;
  // Retrieve the file attachments for the article (which should be empty)
  const attachments = await api.functional.economicBoard.articles.files.index(
    connection,
    {
      articleId,
    },
  );
  typia.assert(attachments);
  // Validate the pagination metadata matches expected empty state
  TestValidator.equals(
    "pagination current page",
    attachments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", attachments.pagination.limit, 20);
  TestValidator.equals("pagination records", attachments.pagination.records, 0);
  TestValidator.equals("pagination pages", attachments.pagination.pages, 0);
  // Validate data array is empty
  TestValidator.equals("attachments data length", attachments.data.length, 0);
}
