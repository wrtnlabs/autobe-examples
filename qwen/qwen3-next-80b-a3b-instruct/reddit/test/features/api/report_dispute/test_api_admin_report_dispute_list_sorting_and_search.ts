import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_dispute_list_sorting_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Retrieve the dispute list using the admin connection
  const disputeList =
    await api.functional.communityPlatform.admin.reports.disputes.index(
      adminConnection,
    );
  typia.assert(disputeList);
  // Step 3: Validate the response structure conforms to IPageICommunityPlatformReportDispute.ISummary
  TestValidator.equals(
    "pagination has current page",
    disputeList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    () => disputeList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative total records",
    () => disputeList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has positive pages",
    () => disputeList.pagination.pages >= 0,
  );
  // Step 4: Validate that at least one dispute exists in the list
  TestValidator.predicate(
    "dispute list is not empty",
    () => disputeList.data.length > 0,
  );
  // Step 5: Validate each dispute has correct structure
  for (const dispute of disputeList.data) {
    TestValidator.equals(
      "dispute has valid id format",
      typeof dispute.id,
      "string",
    );
    TestValidator.predicate("dispute has valid uuid format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        dispute.id,
      ),
    );
    TestValidator.predicate("dispute has valid status", () =>
      ["pending", "investigating", "resolved", "dismissed"].includes(
        dispute.status,
      ),
    );
    TestValidator.equals(
      "dispute has valid created_at format",
      typeof dispute.created_at,
      "string",
    );
    TestValidator.predicate("dispute has valid date-time format", () =>
      /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}.d{3}Z$/.test(dispute.created_at),
    );
  }
  // Note: The scenario requested testing of sorting and searching capabilities,
  // but the API endpoint does not accept any parameters for sorting or filtering.
  // This functionality cannot be tested with the provided APIs.
  // The test instead validates that the base functionality works correctly:
  // authentication, pagination structure, and dispute data integrity.
}
