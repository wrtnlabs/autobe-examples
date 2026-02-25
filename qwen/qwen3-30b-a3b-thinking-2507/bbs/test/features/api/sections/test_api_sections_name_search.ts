import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sections_name_search(
  connection: api.IConnection,
): Promise<void> {
  // Search for sections containing 'Politics' (case-insensitive)
  const result: IPageIEconomicPoliticalDiscussionBoardSection.ISummary =
    await api.functional.economicPoliticalDiscussionBoard.sections.index(
      connection,
      {
        body: {
          search: "Politics",
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(result);
  // Validate all returned sections contain 'Politics' in name (case-insensitive)
  for (const section of result.data) {
    TestValidator.predicate(
      `Section name '${section.name}' should contain 'Politics' (case-insensitive)`,
      section.name.toLowerCase().includes("politics"),
    );
  }
  // Validate article counts are non-negative (as per DTO)
  for (const section of result.data) {
    TestValidator.predicate(
      `Article count '${section.article_count}' for section '${section.name}' should be non-negative`,
      section.article_count >= 0,
    );
  }
}
