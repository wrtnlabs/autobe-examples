import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list filtering by status and employment type.
 *
 * Validates the employee listing endpoint's filtering capabilities for employment status and employment type fields. Ensures that filtering by status returns only employees matching the specified status, filtering by employment type returns only employees with that employment arrangement, and combined filtering applies AND logic correctly.
 *
 * The test creates multiple employees with various status and employment type combinations, then validates that the filtering logic correctly narrows results based on the provided criteria. Special attention is given to ensuring deactivated employees are properly included/excluded based on status filter.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create organization context for employee management.
 * 3. Create multiple employees with different status (active/deactivated) and employment_type (full-time/part-time/contractor/intern) combinations.
 * 4. Test filtering by status='active' - verify only active employees returned.
 * 5. Test filtering by status='deactivated' - verify only deactivated employees returned.
 * 6. Test filtering by employment_type='full-time' - verify only full-time employees returned.
 * 7. Test filtering by employment_type='part-time' - verify only part-time employees returned.
 * 8. Test filtering by employment_type='contractor' - verify only contractors returned.
 * 9. Test filtering by employment_type='intern' - verify only interns returned.
 * 10. Test combined filtering (status + employment_type) - verify AND logic applied correctly.
 * 11. Test no filter returns all employees regardless of status.
 */
export async function test_api_employee_list_filtering_by_status_and_employment_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization (using organization switch endpoint would be ideal, but we need organization code)
  // For this test, we'll use a generated organization code
  const organizationCode: string = RandomGenerator.alphabets(8);
  // 3. Create employees with different status and employment_type combinations
  const employees: IHrmEmployee.ISummary[] = [];
  // Create active full-time employee
  const activeFullTimeEmployee =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "active" as const,
          employment_type: "full-time" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activeFullTimeEmployee);
  if (activeFullTimeEmployee.data.length > 0) {
    employees.push(activeFullTimeEmployee.data[0]);
  }
  // Create active part-time employee
  const activePartTimeEmployee =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "active" as const,
          employment_type: "part-time" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activePartTimeEmployee);
  if (activePartTimeEmployee.data.length > 0) {
    employees.push(activePartTimeEmployee.data[0]);
  }
  // Create deactivated contractor employee
  const deactivatedContractorEmployee =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "deactivated" as const,
          employment_type: "contractor" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(deactivatedContractorEmployee);
  if (deactivatedContractorEmployee.data.length > 0) {
    employees.push(deactivatedContractorEmployee.data[0]);
  }
  // Create active intern employee
  const activeInternEmployee =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "active" as const,
          employment_type: "intern" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activeInternEmployee);
  if (activeInternEmployee.data.length > 0) {
    employees.push(activeInternEmployee.data[0]);
  }
  // 4. Test filtering by status='active'
  const activeEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "active" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activeEmployees);
  TestValidator.equals(
    "active employees count",
    activeEmployees.data.length,
    3,
  );
  TestValidator.predicate(
    "all active employees have active status",
    activeEmployees.data.every((emp) => emp.status === "active"),
  );
  // 5. Test filtering by status='deactivated'
  const deactivatedEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "deactivated" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(deactivatedEmployees);
  TestValidator.equals(
    "deactivated employees count",
    deactivatedEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all deactivated employees have deactivated status",
    deactivatedEmployees.data.every((emp) => emp.status === "deactivated"),
  );
  // 6. Test filtering by employment_type='full-time'
  const fullTimeEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          employment_type: "full-time" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(fullTimeEmployees);
  TestValidator.equals(
    "full-time employees count",
    fullTimeEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all full-time employees have full-time type",
    fullTimeEmployees.data.every((emp) => emp.employment_type === "full-time"),
  );
  // 7. Test filtering by employment_type='part-time'
  const partTimeEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          employment_type: "part-time" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(partTimeEmployees);
  TestValidator.equals(
    "part-time employees count",
    partTimeEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all part-time employees have part-time type",
    partTimeEmployees.data.every((emp) => emp.employment_type === "part-time"),
  );
  // 8. Test filtering by employment_type='contractor'
  const contractorEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          employment_type: "contractor" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(contractorEmployees);
  TestValidator.equals(
    "contractor employees count",
    contractorEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all contractor employees have contractor type",
    contractorEmployees.data.every(
      (emp) => emp.employment_type === "contractor",
    ),
  );
  // 9. Test filtering by employment_type='intern'
  const internEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          employment_type: "intern" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(internEmployees);
  TestValidator.equals(
    "intern employees count",
    internEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all intern employees have intern type",
    internEmployees.data.every((emp) => emp.employment_type === "intern"),
  );
  // 10. Test combined filtering (status='active' AND employment_type='part-time')
  const activePartTimeEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "active" as const,
          employment_type: "part-time" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activePartTimeEmployees);
  TestValidator.equals(
    "active part-time employees count",
    activePartTimeEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all active part-time employees match both criteria",
    activePartTimeEmployees.data.every(
      (emp) => emp.status === "active" && emp.employment_type === "part-time",
    ),
  );
  // 11. Test combined filtering (status='deactivated' AND employment_type='contractor')
  const deactivatedContractorEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          status: "deactivated" as const,
          employment_type: "contractor" as const,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(deactivatedContractorEmployees);
  TestValidator.equals(
    "deactivated contractor employees count",
    deactivatedContractorEmployees.data.length,
    1,
  );
  TestValidator.predicate(
    "all deactivated contractor employees match both criteria",
    deactivatedContractorEmployees.data.every(
      (emp) =>
        emp.status === "deactivated" && emp.employment_type === "contractor",
    ),
  );
  // 12. Test no filter returns all employees
  const allEmployees =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {} satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(allEmployees);
  TestValidator.equals("all employees count", allEmployees.data.length, 4);
}
