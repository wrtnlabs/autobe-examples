import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_contracts_create";
import { generate_random_erp_hrm_time_member_employees_invitations_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_invitations_create";
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";
import { prepare_random_erp_hrm_time_employee_invitation } from "../../../prepare/prepare_random_erp_hrm_time_employee_invitation";

export async function test_api_employee_contract_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const memberBEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "1234!Abcd";
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const foreignEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const contractBody = {
    startDate: new Date().toISOString(),
    payRate: 50000,
    payPeriod: "monthly",
    workingHoursPerWeek: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IErpHrmTimeEmployeeContract.ICreate;
  await TestValidator.error(
    "cross-organization contract creation should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_employees_contracts_create(
        memberAConnection,
        {
          params: {
            employeeId: foreignEmployeeId,
          },
          body: contractBody,
        },
      );
    },
  );
  await generate_random_erp_hrm_time_member_employees_invitations_create(
    memberAConnection,
    {
      body: {
        email: memberAEmail,
      } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
    },
  );
  await generate_random_erp_hrm_time_member_employees_invitations_create(
    memberBConnection,
    {
      body: {
        email: memberBEmail,
      } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
    },
  );
  await TestValidator.error(
    "contract creation for inaccessible employee should fail in the selected organization",
    async () => {
      await generate_random_erp_hrm_time_member_employees_contracts_create(
        memberAConnection,
        {
          params: {
            employeeId: foreignEmployeeId,
          },
          body: contractBody,
        },
      );
    },
  );
}
