import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
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
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_contract_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account (organization is created automatically during join)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  // Step 2: Create an employee in first organization
  const firstEmployee = await generate_random_erp_hrm_member_employees_create(
    firstMemberConnection,
    {},
  );
  // Step 3: Create a contract for the first employee
  const firstContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      firstMemberConnection,
      {
        params: {
          employeeId: firstEmployee.id,
        },
      },
    );
  // Step 4: Create second member account with separate organization
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // Step 5: Second member attempts to access first organization's contract
  // This should fail because the second member belongs to a different organization
  await TestValidator.httpError(
    "cross-organization contract access should be denied",
    [403, 404],
    async () => {
      await api.functional.erpHrm.member.employees.contracts.at(
        secondMemberConnection,
        {
          employeeId: firstEmployee.id,
          contractId: firstContract.id,
        },
      );
    },
  );
}
