import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_articles_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random tag ID to test endpoint with non-existent tag
  const randomTagId = typia.random<string & tags.Format<"uuid">>();
  // Query articles for the tag (endpoint works without authentication)
  const result =
    await api.functional.economicPoliticalBoard.tags.articles.index(
      connection,
      {
        tagId: randomTagId,
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(result);
  // Verify empty result with proper pagination metadata
  TestValidator.equals("empty articles array", result.data.length, 0);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", result.pagination.limit, 20);
  TestValidator.equals("total records is 0", result.pagination.records, 0);
  TestValidator.equals("total pages is 0", result.pagination.pages, 0);
}
