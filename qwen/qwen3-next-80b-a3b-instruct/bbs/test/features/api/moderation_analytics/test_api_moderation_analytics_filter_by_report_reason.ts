import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumPost";
export async function test_api_moderation_analytics_filter_by_report_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Use the connection provided (assume authenticated for admin)
  // Step 2: Define valid report reasons from the schema description
  const validReportReasons = [
    "offensive language",
    "false information",
    "spam",
    "hate speech",
    "harassment",
  ] as const;
  // Step 3: Generate a random valid report reason using RandomGenerator.pick
  const reportReason = RandomGenerator.pick(validReportReasons);
  // Step 4: Call the analytics endpoint with the specific report reason
  const response = await api.functional.economicForum.posts.analytics.index(
    connection,
    {
      body: {
        report_reason: reportReason,
      } satisfies IEconomicForumPost.IRequest,
    },
  );
  // Step 5: Validate response structure
  typia.assert(response);
  // Step 6: Verify response has expected structure with descriptive titles
  TestValidator.predicate(
    "response data array exists",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has positive records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response has pagination field",
    typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "response has data field",
    typeof response.data === "object",
  );
  // Step 7: Test with undefined report_reason to ensure default behavior (all data)
  const responseAll = await api.functional.economicForum.posts.analytics.index(
    connection,
    {
      body: {} satisfies IEconomicForumPost.IRequest,
    },
  );
  typia.assert(responseAll);
  // Step 8: Verify the endpoint responds correctly when no filter is applied
  TestValidator.predicate(
    "response with no filter has data array",
    Array.isArray(responseAll.data),
  );
  TestValidator.predicate(
    "response with no filter has pagination object",
    responseAll.pagination !== undefined,
  );
  TestValidator.predicate(
    "response with no filter has records count",
    typeof responseAll.pagination.records === "number",
  );
  // Step 9: The test validates that the analytics endpoint accepts the report_reason parameter
  // and returns a valid response structure, which is the core requirement.
  // We cannot validate filtering logic (which requires database state control)
  // so we verify only the contract: endpoint accepts parameter and returns expected structure.
}
