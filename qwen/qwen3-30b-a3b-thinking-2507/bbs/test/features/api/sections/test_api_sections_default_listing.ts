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

export async function test_api_sections_default_listing(
  connection: api.IConnection,
): Promise<void> {
  const output =
    await api.functional.economicPoliticalDiscussionBoard.sections.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(output);
  const expectedSections = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Economy",
      article_count: 15,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Politics",
      article_count: 25,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Technology",
      article_count: 10,
    },
  ];
  TestValidator.index(
    "sections sorted alphabetically by name",
    expectedSections,
    output.data,
  );
  TestValidator.equals(
    "article count for Politics section",
    output.data.find((s) => s.name === "Politics")?.article_count,
    25,
  );
}
