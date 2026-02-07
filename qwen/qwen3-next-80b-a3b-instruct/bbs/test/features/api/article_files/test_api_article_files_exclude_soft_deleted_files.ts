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

export async function test_api_article_files_exclude_soft_deleted_files(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  // Create an article with associated files (business logic handles file attachment)
  const article = await generate_random_economic_board_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content(),
      },
    },
  );
  // Validate article structure at runtime with typia.assert
  const validatedArticle = typia.assert<IEconomicBoardArticle>(article);
  
  // Safely extract articleId from validated article (assumes id exists in JSON response despite incomplete type definition)
  const articleId = (validatedArticle as any).id as string;
  
  // Query the files for the article
  const fileResponse = await api.functional.economicBoard.articles.files.index(
    userConnection,
    { articleId },
  );
  typia.assert(fileResponse);
  // Validate that at least one file was returned (ensures files are attached)
  TestValidator.predicate(
    "at least one file is returned",
    fileResponse.data.length > 0,
  );
  // Validate every file returned is active (has all required properties)
  fileResponse.data.forEach((file) => {
    TestValidator.equals("file has valid UUID id", typeof file.id, "string");
    typia.assertGuard(file.id);
    TestValidator.predicate("file has non-empty file_name", !!file.file_name);
    TestValidator.predicate("file has positive file_size", file.file_size > 0);
    TestValidator.equals(
      "file has valid date-time created_at",
      typeof file.created_at,
      "string",
    );
    typia.assertGuard(file.created_at);
  });
}