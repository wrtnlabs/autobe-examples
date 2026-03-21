import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_creation_minimum_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create first member - will become organization owner with employee management permission
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create second member - will be added as employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create employee with minimum required fields only (email + employmentType)
  // departmentId and position are intentionally NOT provided to test optional field handling
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeEmail,
        employmentType: RandomGenerator.pick([
          "full_time",
          "part_time",
          "contractor",
          "intern",
        ] as const),
      },
    },
  );
  typia.assert(employee);
  // Verify required fields are populated
  TestValidator.equals(
    "employee email matches",
    employee.member.email,
    employeeEmail,
  );
  TestValidator.predicate(
    "role is populated",
    employee.role.id !== null && employee.role.id !== undefined,
  );
  TestValidator.predicate(
    "organization is populated",
    employee.organization !== null,
  );
  // Verify optional fields are null since we didn't provide them
  TestValidator.equals(
    "department should be null when not provided",
    employee.department,
    null,
  );
  TestValidator.equals(
    "position should be null when not provided",
    employee.position,
    null,
  );
}
