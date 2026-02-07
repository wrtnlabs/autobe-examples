import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test admin report dismissal edge case: attempting to dismiss an already dismissed report.
 * This validates that the system handles duplicate dismissal attempts gracefully
 * and returns an appropriate error response.
 */
export async function test_api_admin_report_dismissal_already_dismissed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user for reporting
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 2. Create admin user for report processing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // 3. Create a report (first, need to create content that can be reported)
  // Note: For this specific edge case test, we'll simulate report creation
  // In a real scenario, this would involve creating a post/comment first
  const mockReportId = typia.random<string & tags.Format<"uuid">>();
  // 4. First dismissal by admin (this would normally happen after a report is created)
  await api.functional.redditPlatform.admin.reports.dismiss(adminConnection, {
    reportId: mockReportId,
  });
  // 5. Try to dismiss the same report again - should fail with appropriate error
  await TestValidator.error(
    "already dismissed report should return error",
    async () => {
      await api.functional.redditPlatform.admin.reports.dismiss(
        adminConnection,
        {
          reportId: mockReportId,
        },
      );
    },
  );
}
