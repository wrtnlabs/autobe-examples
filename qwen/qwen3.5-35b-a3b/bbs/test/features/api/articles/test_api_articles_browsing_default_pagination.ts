import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_articles_browsing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call articles index endpoint with default pagination parameters (no filters)
  const output = await api.functional.economicPoliticalBoard.articles.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(output);
  // Validate pagination metadata values
  TestValidator.predicate(
    "current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate pagination calculations
  const expectedPages =
    output.pagination.records === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit);
  TestValidator.equals(
    "total pages calculation",
    output.pagination.pages,
    expectedPages,
  );
  // Validate each article has required fields and structure
  for (const article of output.data) {
    // Article ID should be UUID format (validated by typia.assert, just check it exists)
    TestValidator.predicate("article has id", article.id.length > 0);
    // Title should be present
    TestValidator.predicate("article has title", article.title.length > 0);
    // Author should have all required fields
    TestValidator.predicate("author has id", article.author.id.length > 0);
    TestValidator.predicate(
      "author has grade",
      article.author.grade === "regular" || article.author.grade === "super",
    );
    TestValidator.predicate(
      "author has created_at",
      article.author.created_at.length > 0,
    );
    TestValidator.predicate(
      "author has updated_at",
      article.author.updated_at.length > 0,
    );
    // Article should have creation timestamp
    TestValidator.predicate(
      "article has created_at",
      article.created_at.length > 0,
    );
    // Comment count should be non-negative
    TestValidator.predicate(
      "article comment_count is non-negative",
      article.comment_count >= 0,
    );
  }
  // Verify articles are sorted by newest first (created_at DESC)
  if (output.data.length > 1) {
    let sorted = true;
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = new Date(output.data[i].created_at).getTime();
      const next = new Date(output.data[i + 1].created_at).getTime();
      if (current < next) {
        sorted = false;
        break;
      }
    }
    TestValidator.equals("articles sorted by newest first", sorted, true);
  }
}
