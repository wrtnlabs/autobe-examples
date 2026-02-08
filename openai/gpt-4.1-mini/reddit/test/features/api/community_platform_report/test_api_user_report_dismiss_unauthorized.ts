import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Scenario 3: Unauthorized attempt to dismiss a user report.
 * - Precondition: A user account (non-admin) is created and authenticated but lacks admin privileges.
 * - The user attempts to call POST /communityPlatform/admin/reports/{reportId}/dismiss on an existing reportId.
 * - Validate that the response returns a 403 Forbidden error.
 * - Confirm the report status remains unchanged and the report stays active in moderation queues.
 */
export async function test_api_user_report_dismiss_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to create an admin user for comparison or retrieving a report
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Generate a random report id that presumably exists
  // Since creating a real report requires admin or user setup which is not described,
  // we'll just generate a valid UUID to test unauthorized dismissal attempt.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. User connection with no admin privileges
  const userConnection: api.IConnection = { host: connection.host };
  // Attempt to dismiss a report without admin authorization
  await TestValidator.httpError(
    "Unauthorized dismissal returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.admin.reports.dismiss(
        userConnection,
        {
          reportId,
        },
      );
    },
  );
  // Note: Confirming report status unchanged and remains active ideally would require
  // fetching the report, but schema doesn't provide a get report API and the DTO of
  // ICommunityPlatformReport is empty, so we cannot assert report status.
  // Thus, this test confirms the authorization enforcement only.
}
