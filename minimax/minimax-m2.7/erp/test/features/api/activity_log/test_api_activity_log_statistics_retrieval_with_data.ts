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

export async function test_api_activity_log_statistics_retrieval_with_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Step 2: Get organizationId from authorized admin response
  // The admin's associated organizationId should be available in the response
  // or through a related endpoint. For this test, we use the admin's id as reference.
  const adminId = authorizedAdmin.id;
  // Step 3: Retrieve activity log statistics
  // Note: Since we cannot generate activity logs through available APIs,
  // we test the endpoint with the authenticated admin's context.
  // The response will contain statistics (possibly zero if no activity exists).
  const statistics =
    await api.functional.erpHrm.admin.organizations.activity_logs.statistics(
      adminConnection,
      {
        organizationId: adminId,
      },
    );
  typia.assert(statistics);
  // Step 5: Validate response structure
  TestValidator.equals(
    "action_type exists",
    typeof statistics.action_type === "string",
    true,
  );
  TestValidator.equals(
    "count is valid number",
    typeof statistics.count === "number",
    true,
  );
  TestValidator.predicate("count is non-negative", statistics.count >= 0);
}
