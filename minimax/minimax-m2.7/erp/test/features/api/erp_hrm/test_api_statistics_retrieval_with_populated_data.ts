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

export async function test_api_statistics_retrieval_with_populated_data(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authentication
  const admin: IErpHrmAdmin.IAuthorized = await authorize_admin_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    },
  );
  // Create admin connection with authorization token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin.token.access}`,
    },
  };
  // Retrieve organization statistics
  const statistics: IErpHrmStatistic =
    await api.functional.erpHrm.admin.statistics.overview(adminConnection);
  // Validate response structure
  typia.assert(statistics);
  // Validate employees_count
  TestValidator.predicate(
    "employees_count must be non-negative",
    statistics.employees_count >= 0,
  );
  // Validate pending_timesheets_count
  TestValidator.predicate(
    "pending_timesheets_count must be non-negative",
    statistics.pending_timesheets_count >= 0,
  );
  // Validate weekly_hours
  TestValidator.predicate(
    "weekly_hours must be non-negative",
    statistics.weekly_hours >= 0,
  );
  // Validate high_utilization_projects structure
  TestValidator.equals(
    "high_utilization_projects should be array",
    Array.isArray(statistics.high_utilization_projects),
    true,
  );
  for (const project of statistics.high_utilization_projects) {
    TestValidator.predicate("project name must exist", project.name.length > 0);
    TestValidator.predicate(
      "project color must exist",
      project.color.length > 0,
    );
    TestValidator.predicate(
      "project budget_hours must be non-negative",
      project.budget_hours >= 0,
    );
    TestValidator.predicate(
      "project utilization_percentage must be at least 80",
      project.utilization_percentage >= 80,
    );
  }
  // Validate top_employees structure
  TestValidator.equals(
    "top_employees should be array",
    Array.isArray(statistics.top_employees),
    true,
  );
  TestValidator.predicate(
    "top_employees limited to 5",
    statistics.top_employees.length <= 5,
  );
  for (const employee of statistics.top_employees) {
    TestValidator.predicate(
      "employee name must exist",
      employee.name.length > 0,
    );
    TestValidator.predicate(
      "employee hours must be non-negative",
      employee.hours >= 0,
    );
    TestValidator.equals(
      "employee department can be null or string",
      typeof employee.department === "string" || employee.department === null,
      true,
    );
  }
}
