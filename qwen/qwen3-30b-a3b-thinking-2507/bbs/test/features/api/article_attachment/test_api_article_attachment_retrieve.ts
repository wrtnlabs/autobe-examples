import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_attachment_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for article and attachment
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const attachmentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the attachment details
  const attachment =
    await api.functional.economyPoliticsBoard.articles.attachments.at(
      connection,
      {
        articleId: articleId,
        attachmentId: attachmentId,
      },
    );
  // Complete type validation using typia
  typia.assert(attachment);
  // Validate required fields with business logic
  TestValidator.equals(
    "downloadUrl should be a valid URL string",
    typeof attachment.downloadUrl,
    "string",
  );
  TestValidator.equals(
    "fileType should be a string",
    typeof attachment.fileType,
    "string",
  );
  TestValidator.predicate("size should be positive", attachment.size > 0);
}
