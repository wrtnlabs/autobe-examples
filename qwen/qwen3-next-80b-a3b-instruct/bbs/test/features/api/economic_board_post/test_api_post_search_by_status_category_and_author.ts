import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_post_search_by_status_category_and_author(
  connection: api.IConnection,
) {
  const searchCriteria =
    typia.random<string>() satisfies IEconomicBoardPost.IRequest;

  const result: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.posts.search(connection, {
      body: searchCriteria,
    });
  typia.assert(result);

  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate(
    "pagination current is number",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof result.pagination.pages === "number",
  );
  TestValidator.predicate(
    "result data array exists",
    Array.isArray(result.data),
  );
  TestValidator.predicate(
    "data items are summaries",
    result.data.every(
      (item) =>
        typeof item === "object" &&
        "id" in item &&
        "title" in item &&
        "status" in item &&
        "created_at" in item,
    ),
  );
}
