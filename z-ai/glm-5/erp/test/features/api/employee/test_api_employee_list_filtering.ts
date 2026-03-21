import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create departments for filtering tests
  const department1 = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(department1);
  const department2 = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(department2);
  // Create employees with various employment types and department assignments
  const employmentTypes = [
    "full_time",
    "part_time",
    "contractor",
    "intern",
  ] as const;
  // Create employees with department1
  const employeesDept1: IErpHrmEmployee[] = [];
  for (const employmentType of employmentTypes) {
    const emp = await generate_random_erp_hrm_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType,
          departmentId: department1.id,
        },
      },
    );
    typia.assert(emp);
    employeesDept1.push(emp);
  }
  // Create employees with department2
  const employeesDept2: IErpHrmEmployee[] = [];
  for (const employmentType of employmentTypes) {
    const emp = await generate_random_erp_hrm_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType,
          departmentId: department2.id,
        },
      },
    );
    typia.assert(emp);
    employeesDept2.push(emp);
  }
  // Create employees without department (unassigned)
  const employeesUnassigned: IErpHrmEmployee[] = [];
  for (const employmentType of employmentTypes) {
    const emp = await generate_random_erp_hrm_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType,
          departmentId: null,
        },
      },
    );
    typia.assert(emp);
    employeesUnassigned.push(emp);
  }
  // 1. Test default pagination (page 1, limit 20)
  const defaultPage = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: {} },
  );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page is 1",
    defaultPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit is 20",
    defaultPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records at least created",
    defaultPage.pagination.records >=
      employeesDept1.length +
        employeesDept2.length +
        employeesUnassigned.length,
  );
  // 2. Verify employee summary structure
  if (defaultPage.data.length > 0) {
    const summary = defaultPage.data[0];
    typia.assert<IErpHrmEmployee.ISummary>(summary);
    TestValidator.predicate("summary has id", typeof summary.id === "string");
    TestValidator.predicate("summary has member", summary.member !== null);
    TestValidator.predicate("summary has role", summary.role !== null);
    TestValidator.predicate(
      "summary has employment_type",
      typeof summary.employment_type === "string",
    );
    TestValidator.predicate(
      "summary has status",
      typeof summary.status === "string",
    );
    TestValidator.predicate(
      "summary has created_at",
      typeof summary.created_at === "string",
    );
  }
  // 3. Test filter by employmentType='full_time'
  const fullTimeEmployees = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { employmentType: "full_time" } },
  );
  typia.assert(fullTimeEmployees);
  TestValidator.predicate(
    "all employees are full_time",
    fullTimeEmployees.data.every((e) => e.employment_type === "full_time"),
  );
  // 4. Test filter by employmentType='part_time'
  const partTimeEmployees = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { employmentType: "part_time" } },
  );
  typia.assert(partTimeEmployees);
  TestValidator.predicate(
    "all employees are part_time",
    partTimeEmployees.data.every((e) => e.employment_type === "part_time"),
  );
  // 5. Test filter by departmentId (specific department)
  const dept1Employees = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { departmentId: department1.id } },
  );
  typia.assert(dept1Employees);
  TestValidator.predicate(
    "all employees in department1",
    dept1Employees.data.every(
      (e) => e.department !== null && e.department.id === department1.id,
    ),
  );
  // 6. Test filter by departmentId (another department)
  const dept2Employees = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { departmentId: department2.id } },
  );
  typia.assert(dept2Employees);
  TestValidator.predicate(
    "all employees in department2",
    dept2Employees.data.every(
      (e) => e.department !== null && e.department.id === department2.id,
    ),
  );
  // 7. Test filter by departmentId=null (unassigned employees)
  const unassignedEmployees =
    await api.functional.erpHrm.member.employees.index(memberConnection, {
      body: { departmentId: null },
    });
  typia.assert(unassignedEmployees);
  TestValidator.predicate(
    "all employees unassigned",
    unassignedEmployees.data.every((e) => e.department === null),
  );
  // 8. Test combined filters (employmentType + departmentId)
  const fullTimeDept1Employees =
    await api.functional.erpHrm.member.employees.index(memberConnection, {
      body: {
        employmentType: "full_time",
        departmentId: department1.id,
      },
    });
  typia.assert(fullTimeDept1Employees);
  TestValidator.predicate(
    "all employees are full_time and in department1",
    fullTimeDept1Employees.data.every(
      (e) =>
        e.employment_type === "full_time" &&
        e.department !== null &&
        e.department.id === department1.id,
    ),
  );
  // 9. Test pagination with limit=1
  const page1 = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { page: 1, limit: 1 } },
  );
  typia.assert(page1);
  TestValidator.equals(
    "limit 1 returns at most 1 record",
    page1.data.length,
    Math.min(1, page1.pagination.records),
  );
  TestValidator.equals("page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 1", page1.pagination.limit, 1);
  // 10. Test pagination with limit=100
  const page100 = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { limit: 100 } },
  );
  typia.assert(page100);
  TestValidator.predicate("limit is 100", page100.pagination.limit === 100);
  // 11. Test pagination page 2
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.erpHrm.member.employees.index(
      memberConnection,
      { body: { page: 2, limit: 1 } },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different employees",
        page1.data[0]?.id,
        page2.data[0]?.id,
      );
    }
  }
  // 12. Test combined filter (employmentType='contractor' + unassigned)
  const contractorUnassignedEmployees =
    await api.functional.erpHrm.member.employees.index(memberConnection, {
      body: {
        employmentType: "contractor",
        departmentId: null,
      },
    });
  typia.assert(contractorUnassignedEmployees);
  TestValidator.predicate(
    "all employees are contractor and unassigned",
    contractorUnassignedEmployees.data.every(
      (e) => e.employment_type === "contractor" && e.department === null,
    ),
  );
  // 13. Verify sorting by created_at descending (newest first)
  const allEmployees = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    { body: { limit: 100 } },
  );
  typia.assert(allEmployees);
  if (allEmployees.data.length > 1) {
    for (let i = 0; i < allEmployees.data.length - 1; i++) {
      const current = allEmployees.data[i];
      const next = allEmployees.data[i + 1];
      const currentCreated = new Date(current.created_at).getTime();
      const nextCreated = new Date(next.created_at).getTime();
      TestValidator.predicate(
        "sorted by created_at descending",
        currentCreated >= nextCreated,
      );
    }
  }
  // 14. Test search functionality with partial name matching
  if (allEmployees.data.length > 0) {
    const sampleEmployee = allEmployees.data[0];
    if (sampleEmployee?.member?.displayName) {
      const searchName = sampleEmployee.member.displayName.split(" ")[0];
      if (searchName && searchName.length > 0) {
        const searchResults =
          await api.functional.erpHrm.member.employees.index(memberConnection, {
            body: { search: searchName },
          });
        typia.assert(searchResults);
        TestValidator.predicate(
          "search results contain the queried name",
          searchResults.data.some((e) =>
            e.member.displayName
              .toLowerCase()
              .includes(searchName.toLowerCase()),
          ),
        );
      }
    }
  }
}
