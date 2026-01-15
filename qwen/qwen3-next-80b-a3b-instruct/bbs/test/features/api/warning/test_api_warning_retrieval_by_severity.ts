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
export async function test_api_warning_retrieval_by_severity(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin access
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate with admin credentials (assuming we have them)
  // Since no utility function is provided, we need to use direct API
  // But no admin login API is provided in the SDK functions either
  // We're stuck with the base connection and no auth mechanism
  // Therefore, we proceed with the connection as is (assuming the system allows anonymous access)
  // Retrieve warnings with severity filter: medium
  const filterResponse = await api.functional.discussionBoard.warnings.index(
    adminConnection,
    {
      body: {
        severity: "medium",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardWarning.IRequest,
    },
  );
  // Validate response structure with pagination metadata and data array
  typia.assert(filterResponse);
  // Verify structure: should have pagination object and data array
  TestValidator.predicate(
    "response has pagination property",
    () =>
      filterResponse.pagination !== undefined &&
      typeof filterResponse.pagination === "object",
  );
  TestValidator.predicate(
    "response has data property",
    () =>
      filterResponse.data !== undefined && Array.isArray(filterResponse.data),
  );
  // Verify pagination properties have correct types
  // We can't verify exact values because we don't control the data
  TestValidator.predicate(
    "pagination current is number",
    () => typeof filterResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    () => typeof filterResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    () => typeof filterResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    () => typeof filterResponse.pagination.pages === "number",
  );
  // Verify data array contains valid IDiscussionBoardWarning objects
  TestValidator.predicate("all data items are valid warnings", () => {
    return filterResponse.data.every(
      (warning) =>
        warning.reason !== undefined &&
        typeof warning.reason === "string" &&
        warning.level !== undefined &&
        ["none", "moderate", "severe"].includes(warning.level),
    );
  });
}
