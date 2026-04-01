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

export async function test_api_employee_contract_permission_guard(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const viewerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const viewer = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(viewer);
  const employeeId = owner.id;
  const contract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: new Date().toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  await TestValidator.httpError(
    "member without employee:view permission should be denied",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.at(
        viewerConnection,
        {
          employeeId,
          contractId: contract.id,
        },
      );
    },
  );
  const fetched = await api.functional.erpHrmTime.member.employees.contracts.at(
    ownerConnection,
    {
      employeeId,
      contractId: contract.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("contract id matches", fetched.id, contract.id);
  TestValidator.equals(
    "contract employee matches",
    fetched.employee,
    contract.employee,
  );
  TestValidator.equals(
    "contract start date matches",
    fetched.startDate,
    contract.startDate,
  );
  TestValidator.equals(
    "contract end date matches",
    fetched.endDate,
    contract.endDate,
  );
  TestValidator.equals(
    "contract pay rate matches",
    fetched.payRate,
    contract.payRate,
  );
  TestValidator.equals(
    "contract pay period matches",
    fetched.payPeriod,
    contract.payPeriod,
  );
  TestValidator.equals(
    "contract working hours match",
    fetched.workingHoursPerWeek,
    contract.workingHoursPerWeek,
  );
  TestValidator.equals("contract notes match", fetched.notes, contract.notes);
}
