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

export async function test_api_contract_list_manager_permission_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create manager account (who will have employee:view permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // Step 2: Create target member account (who will become the employee whose contracts are viewed)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMemberAuth);
  // Step 3: Manager creates employee record for target member in manager's organization
  // This allows manager to manage the target employee's contracts
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: targetMemberAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Step 4: Create multiple contracts for the employee with different time periods
  // Contract 1: Historical contract (ended in the past)
  const pastStartDate = new Date();
  pastStartDate.setMonth(pastStartDate.getMonth() - 3);
  const pastEndDate = new Date();
  pastEndDate.setMonth(pastEndDate.getMonth() - 1);
  const historicalContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: pastStartDate.toISOString(),
          end_date: pastEndDate.toISOString(),
          pay_rate: 4000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Historical contract for testing",
        },
      },
    );
  typia.assert(historicalContract);
  // Contract 2: Active contract (started in past, no end date)
  const activeStartDate = new Date();
  activeStartDate.setMonth(activeStartDate.getMonth() - 1);
  const activeContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: activeStartDate.toISOString(),
          pay_rate: 5000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Active contract for testing",
        },
      },
    );
  typia.assert(activeContract);
  // Contract 3: Upcoming contract (starts in the future)
  const futureStartDate = new Date();
  futureStartDate.setMonth(futureStartDate.getMonth() + 1);
  const upcomingContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: futureStartDate.toISOString(),
          pay_rate: 5500,
          pay_period: "monthly",
          working_hours_per_week: 45,
          notes: "Upcoming contract for testing",
        },
      },
    );
  typia.assert(upcomingContract);
  // Step 5: Manager retrieves all contracts for the target employee
  const allContractsResponse =
    await api.functional.erpHrm.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employee.id,
        body: {},
      },
    );
  typia.assert(allContractsResponse);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    allContractsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data exists",
    Array.isArray(allContractsResponse.data),
  );
  TestValidator.equals(
    "total records",
    allContractsResponse.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all contracts returned",
    allContractsResponse.data.length === 3,
  );
  // Step 6: Validate contract summaries contain expected fields
  for (const contract of allContractsResponse.data) {
    TestValidator.predicate("has id", contract.id !== undefined);
    TestValidator.predicate("has startDate", contract.startDate !== undefined);
    TestValidator.predicate(
      "has payRate",
      typeof contract.payRate === "number",
    );
    TestValidator.predicate("has payPeriod", contract.payPeriod !== undefined);
    TestValidator.predicate(
      "has workingHoursPerWeek",
      typeof contract.workingHoursPerWeek === "number",
    );
    TestValidator.predicate(
      "has isActive",
      typeof contract.isActive === "boolean",
    );
  }
  // Step 7: Filter contracts by active status
  const activeContractsResponse =
    await api.functional.erpHrm.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employee.id,
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeContractsResponse);
  // Validate only active contracts are returned
  TestValidator.predicate(
    "active contracts filter works",
    activeContractsResponse.data.every((c) => c.isActive === true),
  );
  // Step 8: Filter contracts by past status (historical)
  const pastContractsResponse =
    await api.functional.erpHrm.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employee.id,
        body: {
          status: "past",
        },
      },
    );
  typia.assert(pastContractsResponse);
  // Validate only past contracts are returned
  TestValidator.predicate(
    "past contracts filter works",
    pastContractsResponse.data.every((c) => c.isActive === false),
  );
  // Step 9: Filter contracts by upcoming status
  const upcomingContractsResponse =
    await api.functional.erpHrm.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employee.id,
        body: {
          status: "upcoming",
        },
      },
    );
  typia.assert(upcomingContractsResponse);
  // Validate upcoming contracts have future start dates
  TestValidator.predicate(
    "upcoming contracts filter works",
    upcomingContractsResponse.data.every(
      (c) => new Date(c.startDate) > new Date(),
    ),
  );
  // Step 10: Verify manager can view all contract details
  const contractDetails = allContractsResponse.data;
  const activeFromList = contractDetails.find(
    (c) => c.isActive === true && c.notes === "Active contract for testing",
  );
  const historicalFromList = contractDetails.find(
    (c) =>
      c.isActive === false && c.notes === "Historical contract for testing",
  );
  const upcomingFromList = contractDetails.find(
    (c) => c.notes === "Upcoming contract for testing",
  );
  TestValidator.predicate(
    "active contract found",
    activeFromList !== undefined,
  );
  TestValidator.predicate(
    "historical contract found",
    historicalFromList !== undefined,
  );
  TestValidator.predicate(
    "upcoming contract found",
    upcomingFromList !== undefined,
  );
  // Step 11: Validate pagination works correctly
  const paginatedResponse =
    await api.functional.erpHrm.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employee.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page limit respected",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals("page number", paginatedResponse.pagination.current, 1);
  TestValidator.predicate(
    "has more pages",
    paginatedResponse.pagination.pages > 1,
  );
}
