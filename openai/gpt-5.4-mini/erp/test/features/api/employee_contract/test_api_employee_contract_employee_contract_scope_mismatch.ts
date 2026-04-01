import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
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
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";

export async function test_api_employee_contract_employee_contract_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const signedIn = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/member/join",
      referrer: "https://example.com/erpHrmTime",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(signedIn);
  const owningEmployeeId: string = typia.random<string & tags.Format<"uuid">>();
  const mismatchedEmployeeId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const foreignEmployeeId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const contract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: owningEmployeeId },
        body: {
          startDate: new Date().toISOString(),
          payRate: 1000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  await TestValidator.httpError(
    "contract should not be readable through another employee path in the same organization",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.at(
        memberConnection,
        {
          employeeId: mismatchedEmployeeId,
          contractId: contract.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "contract should not be readable from an employee outside the current organization context",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.at(
        memberConnection,
        {
          employeeId: foreignEmployeeId,
          contractId: contract.id,
        },
      );
    },
  );
}
