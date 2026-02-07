import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Perform search with 'Economic' partial match
  const results = await api.functional.economyPoliticsBoard.sections.index(
    connection,
    {
      body: {
        search: "Economic",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(results);
  // Validate count of results
  TestValidator.equals("expected 20 sections", results.data.length, 20);
  TestValidator.equals("has pagination", !!results.pagination, true);
  // Validate section data
  results.data.forEach((section) => {
    TestValidator.predicate(
      "section name is not empty",
      section.name.length > 0,
    );
    TestValidator.predicate(
      "section description has sufficient length",
      section.description.length >= 20,
    );
  });
  // Validate alphabetical sorting by name
  const sortedData = [...results.data].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  TestValidator.index(
    "section names sorted alphabetically",
    sortedData,
    results.data,
    true,
  );
}
