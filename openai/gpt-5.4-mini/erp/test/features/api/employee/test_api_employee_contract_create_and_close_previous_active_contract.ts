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

export async function test_api_employee_contract_create_and_close_previous_active_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: "Password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  await generate_random_erp_hrm_time_member_employees_invitations_create(
    organizationMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
    },
  );
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const firstStartDate = "2026-01-05T00:00:00.000Z";
  const secondStartDate = "2026-03-02T00:00:00.000Z";
  const firstContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      organizationMemberConnection,
      {
        params: { employeeId },
        body: {
          startDate: firstStartDate,
          payRate: 3200,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract employee id",
    firstContract.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "first contract start date",
    firstContract.startDate,
    firstStartDate,
  );
  TestValidator.equals(
    "first contract end date before rollover",
    firstContract.endDate,
    null,
  );
  TestValidator.equals("first contract pay rate", firstContract.payRate, 3200);
  TestValidator.equals(
    "first contract pay period",
    firstContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "first contract working hours",
    firstContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "first contract notes",
    firstContract.notes,
    "Initial contract",
  );
  TestValidator.predicate(
    "first contract timestamps are persisted",
    firstContract.createdAt.length > 0 && firstContract.updatedAt.length > 0,
  );
  TestValidator.equals(
    "first contract deletedAt",
    firstContract.deletedAt,
    null,
  );
  const secondContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      organizationMemberConnection,
      {
        params: { employeeId },
        body: {
          startDate: secondStartDate,
          payRate: 3600,
          payPeriod: "monthly",
          workingHoursPerWeek: 38,
          notes: "Updated contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  TestValidator.equals(
    "second contract employee id",
    secondContract.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "second contract start date",
    secondContract.startDate,
    secondStartDate,
  );
  TestValidator.equals(
    "second contract end date",
    secondContract.endDate,
    null,
  );
  TestValidator.equals(
    "second contract pay rate",
    secondContract.payRate,
    3600,
  );
  TestValidator.equals(
    "second contract pay period",
    secondContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "second contract working hours",
    secondContract.workingHoursPerWeek,
    38,
  );
  TestValidator.equals(
    "second contract notes",
    secondContract.notes,
    "Updated contract",
  );
  TestValidator.predicate(
    "second contract timestamps are persisted",
    secondContract.createdAt.length > 0 && secondContract.updatedAt.length > 0,
  );
  TestValidator.equals(
    "second contract deletedAt",
    secondContract.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "second contract differs from first",
    firstContract.id,
    secondContract.id,
  );
  TestValidator.equals(
    "first contract original start date remains",
    firstContract.startDate,
    firstStartDate,
  );
  TestValidator.equals(
    "first contract original pay rate remains",
    firstContract.payRate,
    3200,
  );
  TestValidator.equals(
    "first contract original notes remains",
    firstContract.notes,
    "Initial contract",
  );
}
