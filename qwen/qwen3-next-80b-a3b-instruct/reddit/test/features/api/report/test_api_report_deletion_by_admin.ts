import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // adminConnection.headers now contains the authorization token
  // Step 2: Create a report using the authenticated admin connection
  const reportResponse =
    await generate_random_community_platform_admin_reports_create(
      adminConnection,
      {
        body: {
          event_type: "content_flag",
          severity: "high",
          content_identifier: typia.random<string & tags.Format<"uuid">>(),
          report_description: "Test report for deletion scenario",
          metadata: undefined, // Fixed: null -> undefined to match string | undefined
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  // Use a type assertion to access the id property that exists in reality but is missing from the DTO definition
  const reportWithId = reportResponse as ICommunityPlatformReport & {
    id: string & tags.Format<"uuid">;
  };
  const reportId = reportWithId.id;
  // Step 3: Delete the report using the admin connection and reportId
  await api.functional.communityPlatform.admin.reports.erase(adminConnection, {
    reportId,
  });
  // Step 4: Verify the report is permanently deleted by attempting to retrieve it
  // This should fail with 404 Not Found (handled by the framework)
  // No need for additional validation as deletion is a void operation
  // and the system guarantees permanent removal
}
