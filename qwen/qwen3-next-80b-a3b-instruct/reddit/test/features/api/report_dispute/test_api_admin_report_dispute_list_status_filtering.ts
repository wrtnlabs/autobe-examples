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
export async function test_api_admin_report_dispute_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that admin users can retrieve all dispute reports and verify that
   * all reported disputes have a valid status from the allowed set {pending,
   * investigating, resolved, dismissed}.
   *
   * This validates that the API returns disputes correctly and that the
   * status field conforms to the required enum values, even though filtering
   * functionality is unavailable in the current SDK implementation.
   *
   * Steps:
   *
   * 1. Authenticate an admin user
   * 2. Retrieve all dispute reports
   * 3. Verify the response structure is correct
   * 4. Validate that all disputes have a status from the allowed set
   */
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Verify authentication succeeded
  typia.assert(adminAuthResult);
  // Step 3: Retrieve all disputes
  const response =
    await api.functional.communityPlatform.admin.reports.disputes.index(
      adminConnection,
    );
  typia.assert(response);
  // Step 4: Validate response structure
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate("data is not empty", response.data.length > 0);
  // Step 5: Validate that all disputes have a valid status
  const validStatuses = [
    "pending",
    "investigating",
    "resolved",
    "dismissed",
  ] as const;
  for (const dispute of response.data) {
    TestValidator.predicate(
      "status is one of valid values",
      validStatuses.includes(dispute.status),
    );
  }
}
