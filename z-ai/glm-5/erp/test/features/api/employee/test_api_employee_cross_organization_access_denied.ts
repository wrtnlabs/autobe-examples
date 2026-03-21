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
 * Test that attempting to access an employee from a different organization
 * returns 403 Forbidden, enforcing organization-level data isolation.
 *
 * Setup:
 * 1. Create member A with organization A (owner of organization A)
 * 2. Create an employee in organization A
 * 3. Create member B with organization B (separate organization)
 * 4. Member B attempts to retrieve member A's employee by ID
 *
 * Expected: 403 Forbidden error, confirming cross-organization access is denied
 */
export async function test_api_employee_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A and their organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create an employee in organization A using the generation utility
  const employeeInOrgA = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employeeInOrgA);
  // 3. Create member B with organization B (separate organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B attempts to retrieve employee from organization A
  // This should result in 403 Forbidden error
  await TestValidator.httpError(
    "should deny cross-organization employee access with 403",
    403,
    async () => {
      await api.functional.erpHrm.member.employees.at(memberBConnection, {
        employeeId: employeeInOrgA.id,
      });
    },
  );
}
