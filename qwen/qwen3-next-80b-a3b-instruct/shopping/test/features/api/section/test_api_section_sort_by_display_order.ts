import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_sort_by_display_order(
  connection: api.IConnection,
): Promise<void> {
  // Get sections with sort by display_order ascending
  const ascendingResponse = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "displayOrder",
        order: "asc",
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(ascendingResponse);
  // Get sections with sort by display_order descending
  const descendingResponse = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "displayOrder",
        order: "desc",
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(descendingResponse);
  // Validate ascending order: sections should be ordered by display_order from low to high
  const ascendingSections = ascendingResponse.data;
  for (let i = 1; i < ascendingSections.length; i++) {
    TestValidator.predicate(
      `section ${i} display_order >= section ${i - 1} when sorted ascending`,
      ascendingSections[i].display_order >=
        ascendingSections[i - 1].display_order,
    );
  }
  // Validate descending order: sections should be ordered by display_order from high to low
  const descendingSections = descendingResponse.data;
  for (let i = 1; i < descendingSections.length; i++) {
    TestValidator.predicate(
      `section ${i} display_order <= section ${i - 1} when sorted descending`,
      descendingSections[i].display_order <=
        descendingSections[i - 1].display_order,
    );
  }
  // Verify that at least one section is found to ensure sorting works
  TestValidator.predicate(
    "at least one section exists for sorting validation",
    ascendingSections.length > 0,
  );
}
