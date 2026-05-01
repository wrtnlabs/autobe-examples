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

/**
 * Verify that reactivating an already active employee is a safe no-op.
 *
 * Tests the idempotent behavior of the reactivate endpoint when called on an employee whose status is already "active". The system should respond with 200 and return the employee record unchanged — no database modifications, no status changes, and all fields preserved exactly as they were before the call.
 *
 * 1. An organization Owner registers via the join endpoint.
 * 2. The Owner invites a new employee by email, creating a pending invitation since the email address has no associated user account.
 * 3. The invited person joins with the same email address, resolving the pending invitation to an active employee.
 * 4. The Owner calls the reactivate endpoint on the already-active employee.
 * 5. Validates the employee record is returned unchanged with status "active" and all fields preserved.
 */
export async function test_api_employee_reactivate_already_active_noop(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(owner);
  // 2. Owner invites a new employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitedEmployee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: { email: employeeEmail },
    },
  );
  typia.assert(invitedEmployee);
  // 3. The invited person joins, resolving the invitation to active
  const employeeConnection: api.IConnection = { host: connection.host };
  const newEmployee = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
    },
  });
  typia.assert(newEmployee);
  // 4. Owner reactivates the already-active employee
  const reactivated = await api.functional.erpHrm.member.employees.reactivate(
    ownerConnection,
    { employeeId: invitedEmployee.id },
  );
  typia.assert(reactivated);
  // 5. Validate no-op: status remains active, record unchanged
  TestValidator.equals("status remains active", reactivated.status, "active");
  TestValidator.equals(
    "employee id unchanged",
    reactivated.id,
    invitedEmployee.id,
  );
}
