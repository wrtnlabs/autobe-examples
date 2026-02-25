import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sections_sort_created_at_desc(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve sections sorted by created_at_desc (newest first)
  const response = await api.functional.economicBoard.sections.index(
    connection,
    {
      body: {
        sort: "created_at_desc",
      },
    },
  );
  typia.assert(response);
  // Validate that sections are sorted by created_at in descending order
  const sections = response.data;
  // Check that sections are properly ordered (newest first)
  for (let i = 0; i < sections.length - 1; i++) {
    const current = new Date(sections[i].created_at);
    const next = new Date(sections[i + 1].created_at);
    TestValidator.predicate(
      "sections sorted by created_at desc",
      current >= next,
    );
  }
}
