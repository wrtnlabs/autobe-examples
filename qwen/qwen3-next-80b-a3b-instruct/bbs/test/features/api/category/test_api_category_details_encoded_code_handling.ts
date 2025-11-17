import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";

export async function test_api_category_details_encoded_code_handling(
  connection: api.IConnection,
) {
  const encodedCategoryCode = "economy%20politics";
  const category: IEconomicBoardCategory =
    await api.functional.economicBoard.settings.categories.at(connection, {
      categoryCode: encodedCategoryCode,
    });
  typia.assert(category);
  TestValidator.equals(
    "retrieved category should be a valid encoded system category",
    category,
    category,
  );
}
