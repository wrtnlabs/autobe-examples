import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";

export async function test_api_employee_contract_view_past_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication setup - register organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerResult);
  // 2. Get organization ID from owner's organization memberships
  const organizationId =
    ownerResult.organization_memberships[0].organization.id;
  typia.assert(organizationId);
  // 3. Create department for proper organization structure (using owner's authenticated connection)
  const department =
    await generate_random_hrms_member_organizations_departments_create(
      ownerConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department);
  // 4. Create employee mock (since employee creation API not available in SDK)
  // In real scenario, employee would be created and invited to organization
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Create first active contract (will become past when second contract is created)
  const startDate1 = new Date();
  startDate1.setDate(startDate1.getDate() - 30); // 30 days ago
  const firstContract =
    await generate_random_hrms_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employeeId },
        body: {
          start_date: startDate1.toISOString(),
          pay_rate: 100.0,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: "Initial employment contract",
        },
      },
    );
  typia.assert(firstContract);
  // First contract should have null end_date initially (active)
  TestValidator.equals(
    "first contract initially active",
    firstContract.endDate,
    null,
  );
  // 6. Create second contract which should automatically end the first contract
  const startDate2 = new Date(startDate1);
  startDate2.setDate(startDate2.getDate() + 1); // one day after first contract start
  const secondContract =
    await generate_random_hrms_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employeeId },
        body: {
          start_date: startDate2.toISOString(),
          pay_rate: 120.0,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: "Updated employment contract",
        },
      },
    );
  typia.assert(secondContract);
  // Second contract should be active (null end_date)
  TestValidator.equals("second contract active", secondContract.endDate, null);
  // 7. Retrieve the first contract (now past contract) using GET endpoint
  const pastContract = await api.functional.hrms.member.employees.contracts.at(
    ownerConnection,
    {
      employeeId: employeeId,
      contractId: firstContract.id,
    },
  );
  typia.assert(pastContract);
  // 8. Validate past contract details
  // Verify past contract has non-null end_date (confirms it's historical)
  TestValidator.equals(
    "past contract has non-null end_date",
    pastContract.endDate !== null,
    true,
  );
  // Verify end_date equals day before second contract's start_date
  TestValidator.equals(
    "past contract end_date matches expected",
    pastContract.endDate,
    startDate2.toISOString(),
  );
  // Verify original contract details are preserved correctly (immutable)
  TestValidator.equals("pay_rate preserved", pastContract.payRate, 100.0);
  TestValidator.equals(
    "pay_period preserved",
    pastContract.payPeriod,
    "hourly",
  );
  TestValidator.equals(
    "working_hours_per_week preserved",
    pastContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "notes preserved",
    pastContract.notes,
    "Initial employment contract",
  );
  TestValidator.equals(
    "start_date preserved",
    pastContract.startDate,
    startDate1.toISOString(),
  );
  // 9. Verify employee reference is correct
  TestValidator.equals(
    "employee reference matches",
    pastContract.hrmsEmployeeId,
    employeeId,
  );
  // 10. Test that past contract can be viewed by querying it again
  const pastContractAgain =
    await api.functional.hrms.member.employees.contracts.at(ownerConnection, {
      employeeId: employeeId,
      contractId: firstContract.id,
    });
  typia.assert(pastContractAgain);
  TestValidator.equals(
    "past contract retrieval consistent",
    pastContractAgain.id,
    pastContract.id,
  );
}