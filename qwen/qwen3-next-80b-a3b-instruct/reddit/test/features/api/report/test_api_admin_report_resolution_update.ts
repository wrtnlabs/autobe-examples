import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfAdmins";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_resolution_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Generate a unique report ID to use for both creation and update
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a report record using the update endpoint - this is a common pattern
  // when no explicit create endpoint exists and the system supports upserts via PUT
  // We send a minimal IUpdate object with all required fields
  const reportData = {
    id: reportId,
    reporter_type: "member",
    action_type: "content_removal",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
  } satisfies ICommunityPlatformReportOfAdmins.IUpdate;
  // Create the report using the update endpoint by sending data for a non-existent report
  // The system may treat this as a create (upsert) operation
  const createdReport =
    await api.functional.communityPlatform.admin.report.of.admins.update(
      adminConnection,
      {
        logId: reportId,
        body: reportData,
      },
    );
  typia.assert(createdReport);
  // Step 4: Update the status of the report to 'resolved'
  // We must send the complete IUpdate structure with all required fields
  // We do NOT send resolution_notes as it is not part of the IUpdate type
  const updateData = {
    id: reportId,
    reporter_type: "member", // Must be included, should match original
    action_type: "content_removal", // Must be included, should match original
    status: "resolved", // Updated status
    created_at: createdReport.created_at, // Preserve original creation time
    updated_at: new Date().toISOString(), // Will be overridden by server
    resolved_at: new Date().toISOString(), // Will be overridden by server
  } satisfies ICommunityPlatformReportOfAdmins.IUpdate;
  const updatedReport =
    await api.functional.communityPlatform.admin.report.of.admins.update(
      adminConnection,
      {
        logId: reportId,
        body: updateData,
      },
    );
  typia.assert(updatedReport);
  // Step 5: Validate the update was successful with only possible validations
  // We only validate what the IUpdate structure allows and the system guarantees
  TestValidator.equals(
    "report status changed to resolved",
    updatedReport.status,
    "resolved",
  );
  // Verify resolved_at was set and is in the correct format - this is guaranteed by typia.assert()
  // We do not validate the exact time or format manually because typia.assert() already does
  // Complete type validation is guaranteed by typia.assert()
}
