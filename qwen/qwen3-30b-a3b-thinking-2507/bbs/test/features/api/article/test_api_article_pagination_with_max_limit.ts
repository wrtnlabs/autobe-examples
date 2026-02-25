import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_pagination_with_max_limit(
  connection: api.IConnection,
): Promise<void> {
  const output =
    await api.functional.economicPoliticalDiscussionBoard.articles.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(output);
  // Verify response data array length
  TestValidator.equals(
    "response contains exactly 20 items",
    output.data.length,
    20,
  );
  // Verify pagination limit is correctly set
  TestValidator.equals(
    "pagination limit matches request value",
    output.pagination.limit,
    20,
  );
  // Verify current page is 1
  TestValidator.equals(
    "pagination current page is 1",
    output.pagination.current,
    1,
  );
  // Verify records and pages match the expected count
  const expectedRecords = 20;
  TestValidator.equals(
    "pagination records count matches expected",
    output.pagination.records,
    expectedRecords,
  );
  TestValidator.equals(
    "pagination pages count matches expected",
    output.pagination.pages,
    1,
  );
}
