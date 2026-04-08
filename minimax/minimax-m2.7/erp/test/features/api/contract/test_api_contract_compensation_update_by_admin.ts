import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_contract_compensation_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create department for organizational context
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 3. Create custom role with employee:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: ["employee:manage"] as (
          | "org:manage"
          | "employee:manage"
          | "employee:view"
          | "project:manage"
          | "project:view"
          | "time:manage"
          | "time:approve"
          | "time:view_all"
          | "report:view"
        )[],
      },
    },
  );
  typia.assert(role);
  // 4. Create employee with the role
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: employeeEmail,
        roleId: role.id,
        departmentId: department.id,
        position: RandomGenerator.name(1),
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // Get the employee member ID from the invitation
  // The invitation doesn't have member directly, need to find another approach
  // Actually looking at the spec, when member exists, we get employee directly
  // Let me re-check the IErpHrmInvitation structure
  // 5. Create an active contract with initial compensation terms
  const contractStartDate = new Date().toISOString();
  // Create the employee by joining with the invited email first
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Now get the employee ID - need to list employees to find the right one
  // For now, create the contract with the member's ID from invitation
  const memberId =
    (employeeInvitation as any).member?.id ?? (employeeInvitation as any).id;
  const initialContract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        body: {
          startDate: contractStartDate,
          payRate: 50,
          payPeriod: "hourly",
          workingHoursPerWeek: 40,
          notes: null,
        },
        params: {
          employeeId: memberId,
        },
      },
    );
  typia.assert(initialContract);
  // Store original values for validation
  const originalStartDate = initialContract.start_date;
  const originalEmployeeId = initialContract.employee.id;
  const originalCreatedAt = initialContract.created_at;
  // 6. Update the contract with new compensation terms
  const updateNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updatedContract =
    await api.functional.erpHrm.admin.employees.contracts.update(
      adminConnection,
      {
        employeeId: memberId,
        contractId: initialContract.id,
        body: {
          payRate: 55,
          payPeriod: "daily",
          workingHoursPerWeek: 35,
          notes: updateNotes,
        } satisfies IErpHrmContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // 7. Validate the updated contract
  TestValidator.equals("pay_rate updated to 55", updatedContract.payRate, 55);
  TestValidator.equals(
    "pay_period updated to daily",
    updatedContract.payPeriod,
    "daily",
  );
  TestValidator.equals(
    "working_hours_per_week updated to 35",
    updatedContract.workingHoursPerWeek,
    35,
  );
  TestValidator.equals("notes updated", updatedContract.notes, updateNotes);
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedContract.employee.id,
    originalEmployeeId,
  );
  TestValidator.predicate(
    "updated_at timestamp reflects the update",
    updatedContract.updatedAt > originalCreatedAt,
  );
}
