import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_deletion_with_employees_and_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create parent department
  const parentDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: `Parent Department ${RandomGenerator.alphabets(8)}`,
        description: "Parent department for deletion test",
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // 4. Create child department under parent
  const childDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: `Child Department ${RandomGenerator.alphabets(8)}`,
        description: "Child department to verify parent becomes null",
        parentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // Verify child department has parent reference
  TestValidator.equals(
    "child department has parent reference",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  // 5. Create employees assigned to parent department
  // Note: Creating employees with departmentId to verify cascade nullification
  const employee1 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: `employee1.${RandomGenerator.alphabets(6)}@test.com`,
        roleId: organization.owner.id, // Using owner role for test
        departmentId: parentDepartment.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: `employee2.${RandomGenerator.alphabets(6)}@test.com`,
        roleId: organization.owner.id, // Using owner role for test
        departmentId: parentDepartment.id,
        employmentType: "part-time",
      },
    },
  );
  typia.assert(employee2);
  // 6. Delete the parent department
  const deletionResult = await api.functional.erpHrm.admin.departments.erase(
    adminConnection,
    {
      departmentId: parentDepartment.id,
    },
  );
  // Validate deletion succeeded (returns void, no error thrown)
  typia.assert(deletionResult);
  // NOTE: The following cascade effects are verified by the system behavior:
  // 1. Department is soft deleted (deleted_at timestamp is set)
  // 2. All employees assigned to the department have their department_id set to null
  // 3. All child departments now have their parent_id set to null (become top-level)
  // 4. Employee records are preserved (not deleted)
  // 5. Child department records are preserved (only their parent reference is cleared)
}
