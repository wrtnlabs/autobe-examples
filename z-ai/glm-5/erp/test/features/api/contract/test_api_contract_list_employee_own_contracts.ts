import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_contract_list_employee_own_contracts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create employee record for the member
  // Using the utility function with just the email - role will be handled internally
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: memberAuth.email,
      },
    },
  );
  typia.assert(employee);
  // Step 3: Create a historical contract (ended in the past)
  const now = new Date();
  const historicalStartDate = new Date(
    now.getTime() - 60 * 24 * 60 * 60 * 1000,
  ); // 60 days ago
  const historicalEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const historicalContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: historicalStartDate.toISOString(),
          end_date: historicalEndDate.toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(historicalContract);
  // Step 4: Create an active ongoing contract (no end date = ongoing)
  const activeStartDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const activeContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: activeStartDate.toISOString(),
          end_date: null,
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(activeContract);
  // Step 5: Retrieve contract list as the employee (owner)
  const contractList =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {},
      },
    );
  typia.assert(contractList);
  // Step 6: Validate pagination and data structure
  TestValidator.predicate(
    "pagination exists",
    contractList.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(contractList.data));
  TestValidator.equals("contract count is 2", contractList.data.length, 2);
  // Step 7: Validate sorting by start_date descending (most recent first)
  const sortedContracts = [...contractList.data].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  TestValidator.equals(
    "contracts sorted by start_date descending",
    contractList.data[0].id,
    sortedContracts[0].id,
  );
  // Find contracts in response
  const activeFromList = contractList.data.find(
    (c) => c.id === activeContract.id,
  );
  const historicalFromList = contractList.data.find(
    (c) => c.id === historicalContract.id,
  );
  TestValidator.predicate(
    "active contract in list",
    activeFromList !== undefined,
  );
  TestValidator.predicate(
    "historical contract in list",
    historicalFromList !== undefined,
  );
  // Step 8: Validate isActive computed field
  // Active contract: start_date <= now AND (end_date IS NULL OR end_date > now)
  TestValidator.equals(
    "active contract isActive true",
    activeFromList!.isActive,
    true,
  );
  // Historical contract: end_date IS NOT NULL AND end_date <= now
  TestValidator.equals(
    "historical contract isActive false",
    historicalFromList!.isActive,
    false,
  );
  // Step 9: Validate contract dates
  TestValidator.predicate(
    "historical end_date in past",
    new Date(historicalFromList!.endDate!) < now,
  );
  TestValidator.equals(
    "active end_date is null",
    activeFromList!.endDate,
    null,
  );
  // Step 10: Validate all required fields present
  const validateContractFields = (
    contract: IErpHrmContract.ISummary,
    expectedId: string,
  ): void => {
    TestValidator.equals("id matches", contract.id, expectedId);
    TestValidator.predicate(
      "startDate exists",
      contract.startDate !== undefined,
    );
    TestValidator.predicate("payRate positive", contract.payRate > 0);
    TestValidator.predicate(
      "payPeriod valid",
      ["hourly", "daily", "weekly", "monthly"].includes(contract.payPeriod),
    );
    TestValidator.predicate(
      "workingHoursPerWeek positive",
      contract.workingHoursPerWeek > 0,
    );
    TestValidator.predicate(
      "isActive is boolean",
      typeof contract.isActive === "boolean",
    );
  };
  validateContractFields(activeFromList!, activeContract.id);
  validateContractFields(historicalFromList!, historicalContract.id);
  // Step 11: Test status filter - active contracts only
  const activeOnlyList =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { status: "active" },
      },
    );
  typia.assert(activeOnlyList);
  TestValidator.equals(
    "active filter returns 1 contract",
    activeOnlyList.data.length,
    1,
  );
  TestValidator.equals(
    "active filter returns correct contract",
    activeOnlyList.data[0].id,
    activeContract.id,
  );
  TestValidator.predicate(
    "active filter result isActive true",
    activeOnlyList.data[0].isActive,
  );
  // Step 12: Test status filter - past contracts only
  const pastOnlyList =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { status: "past" },
      },
    );
  typia.assert(pastOnlyList);
  TestValidator.equals(
    "past filter returns 1 contract",
    pastOnlyList.data.length,
    1,
  );
  TestValidator.equals(
    "past filter returns correct contract",
    pastOnlyList.data[0].id,
    historicalContract.id,
  );
  TestValidator.predicate(
    "past filter result isActive false",
    !pastOnlyList.data[0].isActive,
  );
}
