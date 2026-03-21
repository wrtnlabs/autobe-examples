import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin with org:manage permission to access activity logs
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Generate valid UUIDs for organization and activity log
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  // Call GET /erpHrm/admin/organizations/{organizationId}/activity-logs/{activityLogId}
  const activityLog =
    await api.functional.erpHrm.admin.organizations.activity_logs.at(
      adminConnection,
      {
        organizationId: organizationId,
        activityLogId: activityLogId,
      },
    );
  // Validate the response structure
  typia.assert(activityLog);
  // Validate the activity log has required fields
  TestValidator.predicate(
    "action_type is string",
    typeof activityLog.action_type === "string",
  );
  TestValidator.predicate(
    "count is number",
    typeof activityLog.count === "number",
  );
  TestValidator.predicate("count is non-negative", activityLog.count >= 0);
}
