import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_erase_valid_and_nonexistent_report(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // 1. Admin joins and authenticates
  // 2. Attempt to delete a report with a random UUID (valid but probably non-existent)
  // 3. Attempt to delete the same report again to verify 404 Not Found error
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID to use as reportId for deletion
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Since no endpoint exists to create a report, we try to delete the report directly.
  // Depending on actual data state, this may succeed or fail if report exists.
  // Our test focuses on validating the delete operation and proper error handling.
  // Try deleting the report - if it exists, should succeed (204 No Content)
  await api.functional.communityPlatform.admin.reports.erase(adminConnection, {
    reportId,
  });
  // 3. Deleting again should raise a 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent report results in 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reports.erase(
        adminConnection,
        {
          reportId,
        },
      );
    },
  );
}
