import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_default(
  connection: api.IConnection,
) {
  // Default parameters: page=1, limit=15, sort_by='name', order='asc'
  const output: IPageIEconPoliticBoardSection.ISummary =
    await api.functional.econPoliticBoard.sections.index(connection, {
      body: {
        page: 1,
        limit: 15,
        sort_by: "name",
        order: "asc",
      } satisfies IEconPoliticBoardSection.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 15);
  TestValidator.predicate(
    "total records should be at least one",
    output.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages calculation correct",
    output.pagination.pages === Math.ceil(output.pagination.records / 15),
  );
}
