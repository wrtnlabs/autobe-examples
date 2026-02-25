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

export async function test_api_activity_log_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to delete a non-existent activity log entry UUID as an admin
  // Steps:
  // 1. Register and authenticate as admin
  // 2. Attempt to delete activity log with a random UUID that does not exist
  // 3. Expect 404 Not Found error to be thrown
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  // Set authorization header to adminConnection for subsequent calls
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Attempt deletion of a non-existent activity log entry
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that deleting non-existent log throws 404 error
  await TestValidator.httpError(
    "deletion of non-existent activity log throws 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.activityLogs.erase(
        adminConnection,
        { id: nonExistentLogId },
      );
    },
  );
}
