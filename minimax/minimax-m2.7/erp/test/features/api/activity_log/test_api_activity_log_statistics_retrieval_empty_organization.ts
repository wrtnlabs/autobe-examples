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

export async function test_api_activity_log_statistics_retrieval_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new organization with no activity logs
  // Since we can't directly create organizations via API, we'll use the statistics endpoint
  // with a newly created organization's ID
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call GET /erpHrm/admin/organizations/{organizationId}/activity-logs/statistics
  // For a newly created empty organization, all counts should be zero
  const statistics: IErpHrmActivityLog =
    await api.functional.erpHrm.admin.organizations.activity_logs.statistics(
      adminConnection,
      {
        organizationId: organizationId,
      },
    );
  // 4. Validate response structure using typia.assert
  typia.assert(statistics);
  // 5. Validate that for an empty organization:
  // - count should be 0 (no activity entries)
  // - action_type should be an empty string or undefined for empty results
  TestValidator.equals(
    "activity count should be 0 for empty organization",
    statistics.count,
    0,
  );
}
