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
 * Test that non-Owner employees cannot create custom roles.
 *
 * Validates role-based access control by confirming that only organization
 * Owners can create custom roles. An Employee (or any non-Owner role) must
 * receive a 403 Forbidden response when attempting to create a custom role.
 *
 * 1. A new member joins and becomes Owner of a newly created organization.
 * 2. The Owner invites a new employee with a pre-generated email address.
 * 3. The invited person joins using the same email, resolving the pending
 *    invitation and joining the organization as a non-Owner employee.
 * 4. The employee attempts to create a custom role with valid data.
 * 5. The request is rejected with HTTP 403 Forbidden, confirming that
 *    only members with the Owner role can create custom roles.
 */
export async function test_api_role_creation_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins (creates organization, becomes Owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Owner invites a new employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: { email: employeeEmail },
    },
  );
  typia.assert(employee);
  // 3. Employee joins (resolves pending invitation)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: { email: employeeEmail },
  });
  typia.assert(employeeAuth);
  // 4. Employee tries to create a custom role → must be rejected with 403
  await TestValidator.httpError(
    "non-owner employee cannot create custom role",
    403,
    async () => {
      await generate_random_erp_hrm_roles_create(employeeConnection, {});
    },
  );
}
