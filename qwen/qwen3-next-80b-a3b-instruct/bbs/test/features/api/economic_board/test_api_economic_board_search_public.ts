import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_economic_board_search_public(
  connection: api.IConnection,
) {
  // Generate random search query with meaningful keyword
  const searchQuery = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  // Search with basic query
  const result1: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: searchQuery satisfies IEconomicBoardSearchMetadata.IRequest,
    });
  typia.assert(result1);

  // Validate pagination is string as defined in schema
  TestValidator.predicate(
    "pagination is string",
    typeof result1.pagination === "string",
  );

  // Validate data array exists
  TestValidator.predicate("data array not empty", result1.data.length > 0);

  // Validate data items are strings as defined in schema (IEconomicBoardPost.ISummary is string)
  TestValidator.predicate(
    "data items are strings",
    result1.data.every((item) => typeof item === "string"),
  );

  // Search with empty string - minimal validation
  const result2: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: "" satisfies IEconomicBoardSearchMetadata.IRequest,
    });
  typia.assert(result2);

  // Validate pagination is string for empty query
  TestValidator.predicate(
    "empty search pagination is string",
    typeof result2.pagination === "string",
  );

  // Validate data array exists for empty query
  TestValidator.predicate(
    "empty search has data",
    ArrayUtil.has(result2.data, (item) => typeof item === "string"),
  );
}
