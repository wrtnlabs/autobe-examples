import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";

export async function test_api_category_details_not_found(
  connection: api.IConnection,
) {
  const validFormatCode = typia.random<string & tags.Pattern<"^[a-z]+">>();
  await TestValidator.httpError(
    "non-existent category should return 404",
    404,
    async () => {
      await api.functional.economicBoard.settings.categories.at(connection, {
        categoryCode: validFormatCode,
      });
    },
  );
}
