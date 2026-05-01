import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
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
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Verifies that deactivating an already-deactivated employee is handled gracefully as a no-op.
 *
 * Tests the idempotent behavior of the employee deactivation endpoint. When an organization owner deactivates an employee that is already in 'deactivated' status, the operation succeeds without error and returns the employee's current state without modification.
 *
 * The test ensures the deactivation endpoint properly handles consecutive calls and that no unintended state changes occur on repeated deactivation of the same employee.
 *
 * 1. Owner member joins the platform to establish an organization context with full permissions.
 * 2. A custom role is created for the employee to be assigned.
 * 3. A second member is registered and invited as an employee with the custom role.
 * 4. The employee is deactivated for the first time — status changes from 'active' to 'deactivated'.
 * 5. The same employee is deactivated for the second time — status remains 'deactivated' with no data modification.
 */
export async function test_api_employee_deactivate_already_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Create second member (the employee-to-be)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 4. Invite member2 as an employee in the owner's organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: member2.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. First deactivation
  const deactivated1 = await api.functional.erpHrm.member.employees.deactivate(
    ownerConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(deactivated1);
  TestValidator.equals(
    "first deactivation status",
    deactivated1.status,
    "deactivated",
  );
  // 6. Second deactivation (no-op)
  const deactivated2 = await api.functional.erpHrm.member.employees.deactivate(
    ownerConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(deactivated2);
  TestValidator.equals(
    "second deactivation status unchanged",
    deactivated2.status,
    "deactivated",
  );
  TestValidator.equals(
    "role consistent after second deactivation",
    deactivated2.role.id,
    deactivated1.role.id,
  );
  TestValidator.equals(
    "member id consistent after second deactivation",
    deactivated2.member.id,
    deactivated1.member.id,
  );
}
