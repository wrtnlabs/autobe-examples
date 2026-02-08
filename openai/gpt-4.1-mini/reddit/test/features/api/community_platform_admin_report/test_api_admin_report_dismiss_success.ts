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
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_admin_report_dismiss_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful dismissal of an existing user report by an administrator.
  // - Precondition: An admin account is registered and authenticated.
  // - The admin creates a user report to have a valid reportId.
  // - The admin calls POST /communityPlatform/admin/reports/{reportId}/dismiss with the valid reportId.
  // - Validate the response returns the report entity with status set to 'dismissed'.
  // - Confirm the report is no longer present in active moderation queues.
  // - Confirm that no errors occur and the operation respects authorization rules.
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create user report for dismissal
  const userReport = await generate_random_community_platform_reports_create(
    adminConnection,
    {
      // Generate with default or empty body for random
    },
  );
  typia.assert(userReport);

  // 3. Dismiss the report by admin
  const dismissedReport = await api.functional.communityPlatform.admin.reports.dismiss(
    adminConnection,
    {
      reportId: (userReport as { id: string }).id,
    },
  );
  typia.assert(dismissedReport as any);

  // 4. Validate the dismissed report's status
  TestValidator.equals(
    "report status is dismissed",
    (dismissedReport as any).status,
    "dismissed",
  );
}
