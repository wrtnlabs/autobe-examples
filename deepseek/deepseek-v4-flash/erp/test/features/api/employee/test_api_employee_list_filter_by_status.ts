import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_employee_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all employees (no status filter)
  const allEmployees = await api.functional.hrmTimeTracking.employees.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  const allStatuses = allEmployees.data.map((e) => e.status);
  // 2. Fetch active employees
  const activeEmployees = await api.functional.hrmTimeTracking.employees.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(activeEmployees);
  TestValidator.predicate("all active employees have status 'active'", () =>
    activeEmployees.data.every((e) => e.status === "active"),
  );
  // 3. Fetch deactivated employees
  const deactivatedEmployees =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        status: "deactivated",
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(deactivatedEmployees);
  TestValidator.predicate(
    "all deactivated employees have status 'deactivated'",
    () => deactivatedEmployees.data.every((e) => e.status === "deactivated"),
  );
  // 4. Verify combined total matches
  const activeCount = activeEmployees.data.length;
  const deactivatedCount = deactivatedEmployees.data.length;
  const totalCount = allEmployees.data.length;
  // Count only employees with known statuses in the unfiltered list
  const knownStatusCount = allEmployees.data.filter(
    (e) => e.status === "active" || e.status === "deactivated",
  ).length;
  TestValidator.equals(
    "active + deactivated count matches known status count",
    activeCount + deactivatedCount,
    knownStatusCount,
  );
}
