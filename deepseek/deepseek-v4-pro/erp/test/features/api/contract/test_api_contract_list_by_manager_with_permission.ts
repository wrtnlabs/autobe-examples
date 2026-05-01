import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that a manager with the `employee:view` permission can list another employee's contracts.
 *
 * Validates cross-employee contract visibility within the organization's
 * authorization model. The manager is assigned a custom role with the
 * `employee:view` permission and then queries the contract list for a
 * different employee (the target). The target employee's contract is
 * created by the organization owner with randomized compensation terms.
 *
 * The test confirms that the contract listing endpoint returns paginated
 * results with correct contract data and that the employee reference on
 * each contract points to the target employee, not the manager.
 *
 * 1. Organization owner authenticates and creates a custom role with `employee:view` permission.
 * 2. Owner creates a pending employee invitation for the manager-to-be with that role.
 * 3. Target member joins the platform independently to establish a member account.
 * 4. Owner creates the target employee record immediately since the member already exists.
 * 5. Owner creates a randomized employment contract for the target employee.
 * 6. Manager joins with the matching invitation email, auto-resolving the pending invitation and gaining organization context with the custom role.
 * 7. Manager lists the target employee's contracts via the PATCH endpoint.
 * 8. Validates pagination metadata, contract count, employee reference, and compensation details match the original.
 */
export async function test_api_contract_list_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Generate distinct emails for manager and target
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const targetEmail = typia.random<string & tags.Format<"email">>();
  // 1. Admin/Owner joins — creates the organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {});
  // 2. Admin creates a custom role with employee:view permission for the manager
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {
    body: {
      permissions: ["employee:view"] satisfies string[],
    },
  });
  typia.assert(role);
  // 3. Admin creates a pending employee invitation for the manager
  //    (manager does not exist as a member yet, so a pending invitation is created)
  await generate_random_erp_hrm_member_employees_create(adminConnection, {
    body: {
      email: managerEmail,
      erp_hrm_role_id: role.id,
    },
  });
  // 4. Target member joins independently — establishes member account
  const targetMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(targetMemberConnection, {
    body: { email: targetEmail },
  });
  // 5. Admin creates target employee record — immediate since target member exists
  const targetEmployee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: { email: targetEmail },
    },
  );
  typia.assert(targetEmployee);
  // 6. Admin creates a contract for the target employee
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: targetEmployee.id },
      },
    );
  typia.assert(contract);
  // 7. Manager joins with the matching invitation email — auto-resolves pending invitation
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {
    body: { email: managerEmail },
  });
  typia.assert(managerAuthorized);
  // 8. Manager lists the target employee's contracts
  const result = await api.functional.erpHrm.member.employees.contracts.index(
    managerConnection,
    {
      employeeId: targetEmployee.id,
      body: {} satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(result);
  // 9. Validate response
  TestValidator.predicate("has at least one contract", result.data.length >= 1);
  TestValidator.equals(
    "contract employee is target",
    result.data[0].employee.id,
    targetEmployee.id,
  );
  TestValidator.equals(
    "contract pay rate matches original",
    result.data[0].pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "contract pay period matches original",
    result.data[0].pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "contract working hours match original",
    result.data[0].working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.predicate(
    "pagination current is positive",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is positive",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    result.pagination.pages >= 1,
  );
}
