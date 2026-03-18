import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_employee_detail_within_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const employee = await api.functional.hrmTimeTracking.employees.at(
    employeeConnection,
    {
      employeeId,
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee id matches requested identifier",
    employee.id,
    employeeId,
  );
  TestValidator.predicate(
    "role name is populated",
    employee.role.name.length > 0,
  );
  TestValidator.predicate(
    "role organization name is populated",
    employee.role.organization.name.length > 0,
  );
  if (employee.department !== null) {
    TestValidator.predicate(
      "department name is populated when assigned",
      employee.department.name.length > 0,
    );
  }
}
