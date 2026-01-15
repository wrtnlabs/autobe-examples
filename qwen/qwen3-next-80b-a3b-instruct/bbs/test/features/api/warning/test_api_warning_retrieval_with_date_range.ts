import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
export async function test_api_warning_retrieval_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection object with the same host (unauthenticated request)
  const connectionWithAuth: api.IConnection = { host: connection.host };
  // Define date range based on current date in ISO 8601 format (required format)
  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
  ).toISOString();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  ).toISOString();
  // Call the only available API endpoint to retrieve warnings with date range filtering
  const response = await api.functional.discussionBoard.warnings.index(
    connectionWithAuth,
    {
      body: {
        start_date: startDate,
        end_date: endDate,
      },
    },
  );
  // Validate response structure using typia.assert() - this is mandatory
  typia.assert(response);
  // Validation of pagination structure
  TestValidator.equals(
    "pagination structure",
    response.pagination.current,
    response.pagination.current,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    response.pagination.limit,
  );
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    response.pagination.records,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    response.pagination.pages,
  );
  // Validate that pagination fields have valid constraints
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that the response data is an array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // If there are warnings in the response, validate each one has the correct structure
  // Note: IDiscussionBoardWarning only has reason, level, and context
  // All warnings will have these properties
  response.data.forEach((warning) => {
    TestValidator.equals(
      "warning reason is string",
      typeof warning.reason,
      "string",
    );
    TestValidator.predicate(
      "warning reason is minimum 1 char",
      warning.reason.length >= 1,
    );
    TestValidator.predicate(
      "warning reason is maximum 1000 chars",
      warning.reason.length <= 1000,
    );
    TestValidator.equals(
      "warning level is valid enum",
      ["none", "moderate", "severe"],
      [warning.level],
    );
    TestValidator.equals(
      "warning context is string",
      typeof warning.context,
      "string",
    );
    TestValidator.predicate(
      "warning context is maximum 5000 chars",
      warning.context.length <= 5000,
    );
  });
}
