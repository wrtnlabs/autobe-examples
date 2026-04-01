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

export async function test_api_employee_contract_history_single_active_contract_rule(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const invitation =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      ownerConnection,
      {
        body: {
          email: joined.email,
        } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  const employeeId = joined.id;
  const firstStart = new Date();
  firstStart.setUTCDate(firstStart.getUTCDate() - 14);
  firstStart.setUTCHours(0, 0, 0, 0);
  const firstContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: firstStart.toISOString(),
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial historical contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract starts as active",
    firstContract.endDate,
    null,
  );
  TestValidator.equals(
    "first contract employee id remains stable",
    firstContract.employee,
    firstContract.employee,
  );
  const secondStart = new Date(firstStart.getTime());
  secondStart.setUTCDate(secondStart.getUTCDate() + 7);
  const secondContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: secondStart.toISOString(),
          payRate: 3600,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Follow-up active contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  TestValidator.notEquals(
    "contract ids differ",
    firstContract.id,
    secondContract.id,
  );
  TestValidator.notEquals(
    "contract timestamps differ",
    firstContract.createdAt,
    secondContract.createdAt,
  );
  TestValidator.equals(
    "second contract is currently active",
    secondContract.endDate,
    null,
  );
  TestValidator.equals(
    "contract employee relation is preserved",
    secondContract.employee,
    firstContract.employee,
  );
  const thirdStart = new Date(secondStart.getTime());
  thirdStart.setUTCDate(thirdStart.getUTCDate() + 7);
  const thirdContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: thirdStart.toISOString(),
          payRate: 4200,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Latest contract to keep history moving forward",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(thirdContract);
  TestValidator.notEquals(
    "latest contract differs from previous one",
    secondContract.id,
    thirdContract.id,
  );
  TestValidator.equals(
    "latest contract is active",
    thirdContract.endDate,
    null,
  );
  TestValidator.equals(
    "latest contract employee relation is preserved",
    thirdContract.employee,
    firstContract.employee,
  );
}
