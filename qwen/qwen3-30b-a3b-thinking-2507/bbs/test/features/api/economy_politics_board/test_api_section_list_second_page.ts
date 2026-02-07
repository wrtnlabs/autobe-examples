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

export async function test_api_section_list_second_page(
  connection: api.IConnection,
) {
  const response = await api.functional.economyPoliticsBoard.sections.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(response);
  TestValidator.equals("current page", response.pagination.current, 2);
  TestValidator.equals("page size", response.pagination.limit, 20);
  TestValidator.equals("section count", response.data.length, 20);
  TestValidator.predicate("sections sorted alphabetically", () =>
    response.data.every(
      (section, i, arr) =>
        i === arr.length - 1 || section.name <= arr[i + 1].name,
    ),
  );
}
