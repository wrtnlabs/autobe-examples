import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function test_api_department_delete_parent_relationship_cleanup(
  connection: api.IConnection,
): Promise<void> {
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(connection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(connection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: parentDepartment.id,
      } satisfies IErpHrmTimeDepartment.ICreate,
    });
  typia.assert(childDepartment);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    connection,
    {
      body: {
        member_id: parentDepartment.id,
        role_id: childDepartment.id,
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  await api.functional.erpHrmTime.member.departments.erase(connection, {
    departmentId: parentDepartment.id,
  });
  const childAfter = await api.functional.erpHrmTime.member.departments.create(
    connection,
    {
      body: {
        name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTimeDepartment.ICreate,
    },
  );
  typia.assert(childAfter);
  TestValidator.notEquals(
    "new department should not inherit deleted parent relationship",
    childAfter.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.notEquals(
    "employee should remain present after parent department deletion",
    employee.id,
    parentDepartment.id,
  );
}
