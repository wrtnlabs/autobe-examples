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
 * Test cross-organization data isolation for employee profile retrieval.
 *
 * Validates that when a member from Organization B attempts to access an
 * employee belonging to Organization A, the system returns HTTP 404 (Not Found)
 * rather than HTTP 403 (Forbidden). This behavior prevents information leakage
 * about other organizations' membership — a 403 response would confirm the
 * employee exists but is inaccessible, while a 404 response treats the resource
 * as non-existent from the caller's organization context.
 *
 * The test establishes two independent organizations with their own employees,
 * then performs a cross-organization GET request to verify that data isolation
 * is enforced at the organization scope level before any permission check
 * reveals the existence of the target record.
 *
 * 1. Member A joins the platform, creating Organization A.
 * 2. Member A creates a role and an employee record in Organization A.
 * 3. Member B joins with a different email, creating Organization B.
 * 4. Member B creates a role and an employee record in Organization B to
 *    establish employee:view permission within their own organization.
 * 5. Member B attempts to retrieve Member A's employee by ID and receives a
 *    404 response, confirming cross-organization data isolation.
 */
export async function test_api_employee_profile_cross_organization_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins → Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a role in Organization A
  const roleA = await generate_random_erp_hrm_roles_create(
    memberAConnection,
    {},
  );
  typia.assert(roleA);
  // 3. Member A creates an employee in Organization A
  const employeeA = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    { body: { erp_hrm_role_id: roleA.id } },
  );
  typia.assert(employeeA);
  // 4. Member B joins → Organization B (different email)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(memberB);
  // 5. Member B creates a role in Organization B
  const roleB = await generate_random_erp_hrm_roles_create(
    memberBConnection,
    {},
  );
  typia.assert(roleB);
  // 6. Member B creates an employee in Organization B (establishes employee:view permission)
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberBConnection,
    { body: { erp_hrm_role_id: roleB.id } },
  );
  typia.assert(employeeB);
  // 7. Cross-org access: Member B tries to view Org A's employee → 404
  await TestValidator.httpError(
    "cross-organization employee access returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.employees.at(memberBConnection, {
        employeeId: employeeA.id,
      });
    },
  );
}
