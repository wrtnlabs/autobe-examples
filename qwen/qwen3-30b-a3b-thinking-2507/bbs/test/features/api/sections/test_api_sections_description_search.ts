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

export async function test_api_sections_description_search(
  connection: api.IConnection,
): Promise<void> {
  const sectionsOutput =
    await api.functional.economicPoliticalDiscussionBoard.sections.index(
      connection,
      {
        body: {
          search: "economic",
        },
      },
    );
  typia.assert(sectionsOutput);
  const foundSection = sectionsOutput.data.some((section) =>
    section.description?.toLowerCase().includes("economic"),
  );
  TestValidator.predicate(
    "Found sections with 'economic' in description",
    foundSection,
  );
  for (const section of sectionsOutput.data) {
    TestValidator.predicate(
      `Article count for section ${section.id} is valid`,
      section.article_count >= 0,
    );
  }
}
