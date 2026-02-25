import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_retrieval_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  const article =
    await api.functional.economicPoliticalDiscussionBoard.articles.at(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(article);
  // Validate attachment count and types
  TestValidator.equals(
    "attachments array length",
    article.attachments.length,
    2,
  );
  TestValidator.predicate(
    "has image attachment",
    article.attachments.some((a) => a.type === "image"),
  );
  TestValidator.predicate(
    "has file attachment",
    article.attachments.some((a) => a.type === "file"),
  );
  // Validate attachment timestamp formats
  for (const attachment of article.attachments) {
    TestValidator.predicate(
      "created_at is ISO 8601",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(attachment.created_at),
    );
    TestValidator.predicate(
      "updated_at is ISO 8601",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(attachment.updated_at),
    );
  }
}
