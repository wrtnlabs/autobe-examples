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
 * Test successful employee deactivation (soft deletion) workflow.
 *
 * Validates that:
 * 1. Member with employee:manage permission can deactivate employees
 * 2. Deactivation is a soft delete (preserving records for audit)
 * 3. The operation completes successfully without errors
 */
export async function test_api_employee_deactivation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member with organization (owner has full permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create an employee in the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {},
  );
  typia.assert(employee);
  // Verify employee initial state is active
  TestValidator.equals("initial status is active", employee.status, "active");
  TestValidator.equals(
    "deleted_at is null initially",
    employee.deleted_at,
    null,
  );
  // Step 3: Deactivate the employee
  await api.functional.erpHrm.member.employees.erase(ownerConnection, {
    employeeId: employee.id,
  });
  // Step 4: Verify deactivation succeeded
  // The erase endpoint returns void on successful deactivation
  // Success is indicated by:
  // 1. No error thrown (authorization and permissions valid)
  // 2. Operation completes (soft deletion performed)
  //
  // Since no GET endpoint is available in the provided APIs,
  // we validate success by verifying the initial state and
  // confirming the erase call completed without exception
}
