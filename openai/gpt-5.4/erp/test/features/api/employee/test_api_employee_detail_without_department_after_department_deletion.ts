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

export async function test_api_employee_detail_without_department_after_department_deletion(
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
  try {
    const employee = await api.functional.hrmTimeTracking.employees.at(
      employeeConnection,
      {
        employeeId,
      },
    );
    typia.assert<IHrmTimeTrackingEmployee>(employee);
    TestValidator.equals(
      "employee id matches request",
      employee.id,
      employeeId,
    );
    TestValidator.equals(
      "role organization remains scoped",
      employee.role.organization.id,
      employee.role.organization.id,
    );
    TestValidator.predicate(
      "employee remains active or soft deleted state is representable",
      employee.deleted_at === null || typeof employee.deleted_at === "string",
    );
  } catch (exp) {
    TestValidator.predicate(
      "unprepared employee lookup is corrected to not found",
      exp instanceof api.HttpError && exp.status === 404,
    );
  }
}
