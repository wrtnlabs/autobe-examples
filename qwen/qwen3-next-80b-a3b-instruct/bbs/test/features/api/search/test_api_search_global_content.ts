import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearch";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearch";
export async function test_api_search_global_content(
  connection: api.IConnection,
): Promise<void> {
  // Validate that the global search endpoint accepts a valid search query with minimum required parameter
  const searchKeyword = "test";
  const searchRequest: IDiscussionBoardSearch.IRequest = {
    q: searchKeyword,
  };
  // Perform the global search
  const searchResult: IPageIDiscussionBoardSearch.ISummary =
    await api.functional.discussionBoard.search.global.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);
  // Validate pagination structure exists and has valid properties
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination.current is a number",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination.limit is a number",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination.records is a number",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination.pages is a number",
    typeof searchResult.pagination.pages,
    "number",
  );
  // Validate that pagination properties have minimum acceptable values
  TestValidator.predicate(
    "current page >= 0",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit > 0", searchResult.pagination.limit > 0);
  TestValidator.predicate("records >= 0", searchResult.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", searchResult.pagination.pages >= 0);
  // Validate that data array exists and is an array
  TestValidator.equals(
    "data property exists",
    typeof searchResult.data,
    "object",
  );
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  // Validate each item in data array has correct structure according to IDiscussionBoardSearch.ISummary
  for (const item of searchResult.data) {
    TestValidator.equals("item id is a string", typeof item.id, "string");
    TestValidator.predicate(
      "item id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        item.id,
      ),
    );
    TestValidator.equals(
      "item username is a string",
      typeof item.username,
      "string",
    );
    TestValidator.predicate(
      "item username has at least one character",
      item.username.length >= 1,
    );
    TestValidator.predicate(
      "item username has at most 50 characters",
      item.username.length <= 50,
    );
    TestValidator.equals(
      "item registration_date is a string",
      typeof item.registration_date,
      "string",
    );
    TestValidator.predicate(
      "item registration_date is ISO date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        item.registration_date,
      ),
    );
    if (item.trust_score !== undefined) {
      TestValidator.equals(
        "item trust_score is a number",
        typeof item.trust_score,
        "number",
      );
      TestValidator.predicate(
        "item trust_score is between 0 and 100",
        item.trust_score >= 0 && item.trust_score <= 100,
      );
    }
    // FIXED: Changed from TestValidator.equals to TestValidator.predicate for boolean condition
    TestValidator.predicate(
      "item status is one of valid values",
      ["active", "suspended", "banned"].includes(item.status),
    );
  }
}
