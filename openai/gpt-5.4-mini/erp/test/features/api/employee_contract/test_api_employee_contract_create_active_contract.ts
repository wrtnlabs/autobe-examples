import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function test_api_employee_contract_create_active_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: RandomGenerator.name(),
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const contractBody = {
    startDate: new Date().toISOString(),
    endDate: null,
    payRate: typia.random<number>(),
    payPeriod: RandomGenerator.name(),
    workingHoursPerWeek: typia.random<number>(),
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const contract =
    await generate_random_hrm_time_tracking_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: contractBody,
      },
    );
  typia.assert(contract);
  TestValidator.equals(
    "contract employee id",
    contract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "contract start date",
    contract.startDate,
    contractBody.startDate,
  );
  TestValidator.equals(
    "contract end date",
    contract.endDate,
    contractBody.endDate ?? null,
  );
  TestValidator.equals(
    "contract pay rate",
    contract.payRate,
    contractBody.payRate,
  );
  TestValidator.equals(
    "contract pay period",
    contract.payPeriod,
    contractBody.payPeriod,
  );
  TestValidator.equals(
    "contract working hours per week",
    contract.workingHoursPerWeek,
    contractBody.workingHoursPerWeek,
  );
  TestValidator.equals(
    "contract notes",
    contract.notes,
    contractBody.notes ?? null,
  );
}
