import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

export async function test_api_contract_creation_with_overlapping_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 3. Create invitation - this creates an employee for existing member
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: memberAuth.email,
      },
    },
  );
  typia.assert(invitation);
  // 4. Extract employee ID from invitation response
  // Note: The invitation response may include employee info via type widening
  const invitationAny = invitation as IErpHrmInvitation & {
    employee?: {
      id: string;
    };
  };
  const employeeId = invitationAny.employee?.id;
  // If employee ID is not available from invitation, the test setup is incomplete
  // This is a limitation of the current API design
  if (!employeeId) {
    throw new Error(
      "Employee ID not available from invitation response. " +
        "Test requires an API to query employees after invitation acceptance.",
    );
  }
  // 5. Calculate dates for contracts
  const now = new Date();
  const firstStartDate = new Date(now);
  firstStartDate.setDate(firstStartDate.getDate() - 30); // 30 days ago
  const firstStartDateStr = firstStartDate.toISOString();
  const secondStartDate = new Date(now);
  secondStartDate.setDate(secondStartDate.getDate() - 15); // 15 days ago (within first contract period)
  const secondStartDateStr = secondStartDate.toISOString();
  const expectedFirstEndDate = new Date(secondStartDate);
  expectedFirstEndDate.setDate(expectedFirstEndDate.getDate() - 1); // One day before second contract start
  const expectedFirstEndDateStr = expectedFirstEndDate.toISOString();
  // 6. Create first contract for the employee (no end_date - active contract)
  const firstContract =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          start_date: firstStartDateStr,
          end_date: undefined,
          pay_rate: typia.random<
            number & tags.Type<"double"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Initial contract",
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Verify first contract was created with no end_date
  TestValidator.equals(
    "first contract has no end_date",
    firstContract.end_date,
    undefined,
  );
  // 7. Create second contract with start_date within first contract's period
  // This should trigger the overlap logic and set first contract's end_date
  const secondContract =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          start_date: secondStartDateStr,
          end_date: undefined,
          pay_rate: typia.random<
            number & tags.Type<"double"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Overlapping contract",
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // Verify second contract has correct start_date
  TestValidator.equals(
    "second contract has correct start_date",
    secondContract.start_date,
    secondStartDateStr,
  );
  // 8. Verify the business logic: first contract's end_date should be set
  // to one day before the second contract's start_date
  TestValidator.predicate(
    "first contract was ended due to overlap",
    firstContract.end_date !== undefined && firstContract.end_date !== null,
  );
  if (firstContract.end_date !== undefined && firstContract.end_date !== null) {
    // Normalize dates for comparison (compare date parts only)
    const firstEndDate = new Date(firstContract.end_date);
    const expectedEnd = new Date(expectedFirstEndDateStr);
    TestValidator.equals(
      "first contract end_date is day before second contract start",
      firstEndDate.toISOString().split("T")[0],
      expectedEnd.toISOString().split("T")[0],
    );
  }
}
