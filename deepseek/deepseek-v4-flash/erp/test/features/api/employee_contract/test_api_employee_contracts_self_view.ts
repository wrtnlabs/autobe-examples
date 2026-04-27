import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
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
import { generate_random_hrm_time_tracking_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contracts_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a new organization (auto-creates employee record for owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to obtain the auto-created employee record
  const loginResult = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  const employeeId: string = loginResult.employees[0]!.id;
  // 4. Create an employment contract for the employee
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
      },
    );
  typia.assert(contract);
  // 5. List contracts via PATCH endpoint (self-view, no filters)
  const page = await api.functional.hrmTimeTracking.employees.contracts.index(
    memberConnection,
    {
      employeeId,
      body: {},
    },
  );
  typia.assert(page);
  // 6. Validate response
  TestValidator.equals("contract count", page.data.length, 1);
  TestValidator.equals("contract id matches", page.data[0]!.id, contract.id);
  TestValidator.equals(
    "pay rate matches",
    page.data[0]!.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    page.data[0]!.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working hours match",
    page.data[0]!.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.equals("notes match", page.data[0]!.notes, contract.notes);
  TestValidator.equals(
    "employee id matches",
    page.data[0]!.employee.id,
    employeeId,
  );
  TestValidator.predicate(
    "pagination current > 0",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    page.pagination.records >= 1,
  );
}