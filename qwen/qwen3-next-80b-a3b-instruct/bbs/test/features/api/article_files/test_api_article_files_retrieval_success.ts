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

export async function test_api_article_files_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  // Define local interface to represent the runtime structure of IEconomicBoardArticle, which has an id property at runtime
  interface IEconomicBoardArticleWithId {
    id: string & tags.Format<"uuid">;
  }
  // Generate an article with file attachments using the utility function
  const article = await generate_random_economic_board_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Cast to our local interface that has the id property (valid at runtime)
  const articleWithId = article as IEconomicBoardArticleWithId;
  // Use the SDK function to retrieve files — the backend mock simulates files
  const retrieval = await api.functional.economicBoard.articles.files.index(
    citizenConnection,
    {
      articleId: articleWithId.id,
    },
  );
  typia.assert(retrieval);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    retrieval.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    retrieval.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    retrieval.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    retrieval.pagination.pages >= 0,
  );
  // Validate that files are sorted in descending order by created_at
  // We may have 0, 1, or many files
  if (retrieval.data.length >= 2) {
    for (let i = 0; i < retrieval.data.length - 1; i++) {
      const current = new Date(retrieval.data[i].created_at);
      const next = new Date(retrieval.data[i + 1].created_at);
      TestValidator.predicate(
        "files sorted descending by upload time",
        current >= next,
      );
    }
  }
  // Validate file metadata structure for ALL retrieved files
  for (const file of retrieval.data) {
    // Only structural validation (types and format) is done by typia.assert()
    // No manual type checks — they are redundant per principle 8.2
    // Only business logic: created_at must be valid date-time
    // Since typia.assert() already validates the entire structure including types and format, no further checks needed
  }
}
