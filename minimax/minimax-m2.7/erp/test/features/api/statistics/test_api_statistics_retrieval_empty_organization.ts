import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_statistics_retrieval_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin account (this also creates a new empty organization)
  const authorized = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Create admin-specific connection with authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Retrieve statistics for the empty organization
  const statistics =
    await api.functional.erpHrm.admin.statistics.overview(adminConnection);
  // Validate response structure
  typia.assert(statistics);
  // Validate all statistics are zero/empty for an organization with no data
  TestValidator.equals(
    "employees count should be zero",
    statistics.employees_count,
    0,
  );
  TestValidator.equals(
    "weekly hours should be zero",
    statistics.weekly_hours,
    0,
  );
  TestValidator.equals(
    "pending timesheets count should be zero",
    statistics.pending_timesheets_count,
    0,
  );
  TestValidator.equals(
    "high utilization projects should be empty",
    statistics.high_utilization_projects.length,
    0,
  );
  TestValidator.equals(
    "top employees should be empty",
    statistics.top_employees.length,
    0,
  );
}
