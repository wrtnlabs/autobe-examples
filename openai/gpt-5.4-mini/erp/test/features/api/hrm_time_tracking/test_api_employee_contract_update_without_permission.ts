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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contract_update_without_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(auth);
  const organization =
    await api.functional.hrmTimeTracking.member.organizations.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const employee = await api.functional.hrmTimeTracking.member.employees.create(
    memberConnection,
    {
      body: {
        userAccountId: typia.random<string & tags.Format<"uuid">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        departmentId: null,
        positionTitle: RandomGenerator.name(),
        employmentType: "full-time",
        status: "active",
      } satisfies IHrmTimeTrackingEmployee.ICreate,
    },
  );
  typia.assert(employee);
  const contract =
    await api.functional.hrmTimeTracking.member.employees.contracts.create(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDate: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: null,
          payRate: 50,
          payPeriod: "hourly",
          workingHoursPerWeek: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  const snapshot = {
    startDate: contract.startDate,
    endDate: contract.endDate,
    payRate: contract.payRate,
    payPeriod: contract.payPeriod,
    workingHoursPerWeek: contract.workingHoursPerWeek,
    notes: contract.notes,
    updatedAt: contract.updatedAt,
    deletedAt: contract.deletedAt,
  } satisfies Pick<
    IHrmTimeTrackingEmployeeContract,
    | "startDate"
    | "endDate"
    | "payRate"
    | "payPeriod"
    | "workingHoursPerWeek"
    | "notes"
    | "updatedAt"
    | "deletedAt"
  >;
  await TestValidator.error(
    "member without employee management permission cannot update employee contract",
    async () => {
      await api.functional.hrmTimeTracking.member.employees.contracts.update(
        memberConnection,
        {
          employeeId: employee.id,
          contractId: contract.id,
          body: {
            payRate: contract.payRate + 10,
            notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "contract start date remains unchanged",
    contract.startDate,
    snapshot.startDate,
  );
  TestValidator.equals(
    "contract end date remains unchanged",
    contract.endDate,
    snapshot.endDate,
  );
  TestValidator.equals(
    "contract pay rate remains unchanged",
    contract.payRate,
    snapshot.payRate,
  );
  TestValidator.equals(
    "contract pay period remains unchanged",
    contract.payPeriod,
    snapshot.payPeriod,
  );
  TestValidator.equals(
    "contract working hours remain unchanged",
    contract.workingHoursPerWeek,
    snapshot.workingHoursPerWeek,
  );
  TestValidator.equals(
    "contract notes remain unchanged",
    contract.notes,
    snapshot.notes,
  );
  TestValidator.equals(
    "contract updatedAt remains unchanged",
    contract.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "contract deletedAt remains unchanged",
    contract.deletedAt,
    snapshot.deletedAt,
  );
}
