import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";

export async function test_api_category_details_blank_code(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "empty categoryCode should return error",
    async () => {
      await api.functional.economicBoard.settings.categories.at(connection, {
        categoryCode: "",
      });
    },
  );
}
