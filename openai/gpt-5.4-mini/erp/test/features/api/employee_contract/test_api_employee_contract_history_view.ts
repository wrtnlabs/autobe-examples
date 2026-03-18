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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_contract_history_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const employee = await api.functional.hrmTimeTracking.member.employees.create(
    memberConnection,
    {
      body: {
        userAccountId: typia.random<string & tags.Format<"uuid">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: RandomGenerator.name(1),
        status: "active",
      } satisfies IHrmTimeTrackingEmployee.ICreate,
    },
  );
  typia.assert(employee);
  const response =
    await api.functional.hrmTimeTracking.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackingEmployeeContract.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination exists",
    response.pagination.current >= 1 &&
      response.pagination.limit >= 1 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.equals("pagination page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "data count matches pagination records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "all contracts belong to the target employee",
    response.data.every((contract) => contract.employee.id === employee.id),
  );
  TestValidator.predicate(
    "contract history is ordered by descending start date",
    response.data.every(
      (contract, index, array) =>
        index === 0 ||
        new Date(array[index - 1].startDate).getTime() >=
          new Date(contract.startDate).getTime(),
    ),
  );
  if (response.data.length > 0) {
    TestValidator.predicate(
      "first contract is the current active contract or most recent contract",
      response.data[0].endDate === null || response.data[0].endDate !== null,
    );
  }
}
