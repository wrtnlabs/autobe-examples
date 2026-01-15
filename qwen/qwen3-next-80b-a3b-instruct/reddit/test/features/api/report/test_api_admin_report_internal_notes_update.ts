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
export async function test_api_admin_report_internal_notes_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate sample report data using typia.random
  const originalReport: ICommunityPlatformReportOfAdmins =
    typia.random<ICommunityPlatformReportOfAdmins>();
  // Step 3: Update the report with required updated_at property
  const updatedReport =
    await api.functional.communityPlatform.admin.report.of.admins.update(
      adminConnection,
      {
        logId: originalReport.id,
        body: {
          id: originalReport.id,
          reporter_type: originalReport.reporter_type,
          action_type: originalReport.action_type,
          // Change the status to trigger resolution_notes update
          status: originalReport.status === "open" ? "resolved" : "open",
          created_at: originalReport.created_at,
          resolved_at: originalReport.resolved_at,
          // Required by IUpdate schema - add updated_at with current timestamp
          updated_at: new Date().toISOString(),
        } satisfies ICommunityPlatformReportOfAdmins.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 4: Validate that resolution_notes was updated by the server
  // Note: resolution_notes is not sent in request but returned in response
  TestValidator.equals(
    "report ID unchanged",
    updatedReport.id,
    originalReport.id,
  );
  TestValidator.equals(
    "reporter_type unchanged",
    updatedReport.reporter_type,
    originalReport.reporter_type,
  );
  TestValidator.equals(
    "action_type unchanged",
    updatedReport.action_type,
    originalReport.action_type,
  );
  TestValidator.notEquals(
    "status changed",
    updatedReport.status,
    originalReport.status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedReport.created_at,
    originalReport.created_at,
  );
  // Validate that resolution_notes was updated by the server
  TestValidator.notEquals(
    "resolution_notes updated by server",
    updatedReport.resolution_notes,
    originalReport.resolution_notes,
  );
  // Validate that resolution_notes now has content
  TestValidator.predicate("resolution_notes has content", () => {
    return (
      updatedReport.resolution_notes !== null &&
      updatedReport.resolution_notes !== undefined
    );
  });
}
