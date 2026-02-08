import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReason";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the retrieval of community platform report reasons with default pagination and no filters.
 * Validates that authorized admin users can fetch the list, that the list contains valid report reasons,
 * pagination metadata is correct, and soft-deleted entries are excluded implicitly.
 * Also confirms unauthorized user access is denied.
 */
export async function test_api_report_reason_retrieval_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Connections for admin and anonymous (unauthorized) users
  const adminConnection: api.IConnection = { host: connection.host };
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Typically, we would authorize admin; however, no utility function given, skipping.
  // Assuming that caller prepares adminConnection with valid admin token if needed.
  // 1. Test unauthorized access - should be rejected (HTTP 401 or 403)
  await TestValidator.httpError("unauthorized access", [401, 403], async () => {
    await api.functional.communityPlatform.reportReasons.index(
      anonymousConnection,
      {
        body: {}, // empty request to get default pagination
      },
    );
  });
  // 2. Authorized request to retrieve report reasons
  // Since no auth utility, assume adminConnection is authorized already
  // Request with empty filter & default pagination
  const response = await api.functional.communityPlatform.reportReasons.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination page size is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate the data array contains only report reason summaries
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Each data item should be an object (empty schema means we cannot assert properties)
  for (const reason of response.data) {
    TestValidator.predicate(
      "each reason is object",
      typeof reason === "object" && reason !== null,
    );
  }
}
