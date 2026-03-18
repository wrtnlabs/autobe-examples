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

export async function test_api_employee_contract_update_active_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contractId = typia.random<string & tags.Format<"uuid">>();
  const updateStartedAt = new Date().toISOString();
  const body = {
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    endDate: null,
    payRate: 52000,
    payPeriod: RandomGenerator.pick([
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ] as const),
    workingHoursPerWeek: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  const contract =
    await api.functional.hrmTimeTracking.member.employees.contracts.update(
      memberConnection,
      {
        employeeId,
        contractId,
        body,
      },
    );
  typia.assert(contract);
  TestValidator.equals(
    "contract id should remain the same",
    contract.id,
    contractId,
  );
  TestValidator.equals(
    "employee id should remain the same",
    contract.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "updated notes should be returned",
    contract.notes,
    body.notes,
  );
  TestValidator.equals(
    "updated pay rate should be returned",
    contract.payRate,
    body.payRate,
  );
  TestValidator.equals(
    "updated pay period should be returned",
    contract.payPeriod,
    body.payPeriod,
  );
  TestValidator.equals(
    "updated working hours should be returned",
    contract.workingHoursPerWeek,
    body.workingHoursPerWeek,
  );
  TestValidator.equals(
    "active contract should remain active",
    contract.endDate,
    null,
  );
  TestValidator.predicate(
    "updated timestamp should not be earlier than request start",
    contract.updatedAt >= updateStartedAt,
  );
  TestValidator.equals(
    "member account should stay authenticated",
    member.isActive,
    true,
  );
}
