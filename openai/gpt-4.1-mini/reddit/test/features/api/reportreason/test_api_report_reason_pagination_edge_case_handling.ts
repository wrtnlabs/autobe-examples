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

export async function test_api_report_reason_pagination_edge_case_handling(
  connection: api.IConnection,
): Promise<void> {
  // Unauthorized attempt should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.communityPlatform.reportReasons.index(
      unauthorizedConnection,
      {
        body: {},
      },
    );
  });
  // Authorized actor connection setup
  const authorizedConnection: api.IConnection = { host: connection.host };
  // (Assuming authorization is handled externally or no special auth utility available)
  // Request first page (default paging) to get pagination metadata
  const firstResponse =
    await api.functional.communityPlatform.reportReasons.index(
      authorizedConnection,
      { body: {} },
    );
  typia.assert(firstResponse);
  // Validate pagination metadata correctness
  const { pagination, data } = firstResponse;
  TestValidator.predicate("current page number >= 1", pagination.current >= 1);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages >= current",
    pagination.pages === 0 || pagination.pages >= pagination.current,
  );
  // Validate data length not exceeding limit
  TestValidator.predicate(
    "data array length <= limit",
    data.length <= pagination.limit,
  );
  // Simulate edge case: if current page is beyond pages, data array should be empty
  if (pagination.current > pagination.pages) {
    TestValidator.equals("empty data on beyond last page", data.length, 0);
  }
  // If no pages exist, data array must be empty
  if (pagination.pages === 0) {
    TestValidator.equals("empty data when no pages exist", data.length, 0);
  }
}
