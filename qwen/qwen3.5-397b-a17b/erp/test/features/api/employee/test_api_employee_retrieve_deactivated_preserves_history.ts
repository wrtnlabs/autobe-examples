import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

export async function test_api_employee_retrieve_deactivated_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create an active employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee);
  TestValidator.equals("initial status", employee.status, "active");
  TestValidator.equals("initial deleted_at", employee.deleted_at, null);
  // Store original values for comparison
  const originalEmployee = {
    id: employee.id,
    member_id: employee.member.id,
    organization_id: employee.organization.id,
    role_id: employee.role.id,
    department_id: employee.department?.id ?? null,
    position: employee.position,
    employment_type: employee.employment_type,
    display_name: employee.display_name,
    created_at: employee.created_at,
  };
  // 3. Deactivate the employee by updating status to deactivated
  const deactivatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(memberConnection, {
      employeeId: employee.id,
      body: {
        status: "deactivated",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(deactivatedEmployee);
  // 4. Retrieve the deactivated employee
  const retrievedEmployee =
    await api.functional.hrmPlatform.member.employees.at(memberConnection, {
      employeeId: employee.id,
    });
  typia.assert(retrievedEmployee);
  // 5. Validate deactivated status and deleted_at timestamp
  TestValidator.equals(
    "status is deactivated",
    retrievedEmployee.status,
    "deactivated",
  );
  TestValidator.predicate(
    "deleted_at is populated",
    retrievedEmployee.deleted_at !== null,
  );
  TestValidator.predicate("deleted_at is valid date-time", () => {
    if (retrievedEmployee.deleted_at === null) return false;
    const date = new Date(retrievedEmployee.deleted_at);
    return !isNaN(date.getTime());
  });
  // 6. Verify all historical data is preserved
  TestValidator.equals(
    "employee id preserved",
    retrievedEmployee.id,
    originalEmployee.id,
  );
  TestValidator.equals(
    "member id preserved",
    retrievedEmployee.member.id,
    originalEmployee.member_id,
  );
  TestValidator.equals(
    "organization id preserved",
    retrievedEmployee.organization.id,
    originalEmployee.organization_id,
  );
  TestValidator.equals(
    "role id preserved",
    retrievedEmployee.role.id,
    originalEmployee.role_id,
  );
  if (originalEmployee.department_id !== null) {
    TestValidator.predicate(
      "department preserved",
      retrievedEmployee.department !== null,
    );
    if (retrievedEmployee.department !== null) {
      TestValidator.equals(
        "department id preserved",
        retrievedEmployee.department.id,
        originalEmployee.department_id,
      );
    }
  } else {
    TestValidator.equals(
      "department remains null",
      retrievedEmployee.department,
      null,
    );
  }
  TestValidator.equals(
    "position preserved",
    retrievedEmployee.position,
    originalEmployee.position,
  );
  TestValidator.equals(
    "employment_type preserved",
    retrievedEmployee.employment_type,
    originalEmployee.employment_type,
  );
  TestValidator.equals(
    "display_name preserved",
    retrievedEmployee.display_name,
    originalEmployee.display_name,
  );
  TestValidator.equals(
    "created_at preserved",
    retrievedEmployee.created_at,
    originalEmployee.created_at,
  );
  // Verify member relation data
  TestValidator.equals(
    "member email preserved",
    retrievedEmployee.member.email,
    authResult.email,
  );
  TestValidator.equals(
    "member display_name preserved",
    retrievedEmployee.member.display_name,
    authResult.displayName,
  );
  // Verify organization relation exists
  TestValidator.predicate(
    "organization exists",
    retrievedEmployee.organization.id !== null,
  );
  TestValidator.predicate(
    "organization name exists",
    retrievedEmployee.organization.name.length > 0,
  );
  // Verify role relation exists
  TestValidator.predicate("role exists", retrievedEmployee.role.id !== null);
  TestValidator.predicate(
    "role name exists",
    retrievedEmployee.role.name.length > 0,
  );
  // Verify timestamps are valid
  TestValidator.predicate("updated_at is after created_at", () => {
    return (
      new Date(retrievedEmployee.updated_at) >=
      new Date(retrievedEmployee.created_at)
    );
  });
}
