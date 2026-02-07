import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSearchArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_tags_retrieval_active_article(
  connection: api.IConnection,
): Promise<void> {
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const tag = await api.functional.economicBoard.articles.tags.getByArticleid(
    connection,
    { articleId },
  );
  typia.assert(tag);
  // Validate properties match normalized lowercased trimmed format
  const typedTag = tag as unknown as { id: string; text: string };
  TestValidator.predicate(
    "tag id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(typedTag.id),
  );
  TestValidator.predicate(
    "tag text is a non-empty string",
    typeof typedTag.text === "string" && typedTag.text.length > 0,
  );
  TestValidator.predicate("tag text is trimmed", typedTag.text === typedTag.text.trim());
  TestValidator.predicate(
    "tag text is lowercase",
    typedTag.text === typedTag.text.toLowerCase(),
  );
}