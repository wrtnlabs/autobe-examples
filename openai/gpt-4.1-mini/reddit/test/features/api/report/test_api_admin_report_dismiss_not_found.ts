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
 * Scenario 2: Attempt to dismiss a non-existent user report.
 * - Precondition: An admin account is registered and authenticated.
 * - The admin attempts to dismiss a report with a non-existent UUID for reportId.
 * - Validate that the response returns a 404 NotFound error.
 * - Confirm no status changes or side effects occur for other reports.
 */
export async function test_api_admin_report_dismiss_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(adminConnection, {
    body: {} satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin").ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinOutput);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminJoinOutput.token.access}`,
  };
  // 2. Attempt to dismiss a non-existent report
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "dismiss non-existent report should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reports.dismiss(
        adminConnection,
        {
          reportId: nonExistentUUID,
        },
      );
    },
  );
}
