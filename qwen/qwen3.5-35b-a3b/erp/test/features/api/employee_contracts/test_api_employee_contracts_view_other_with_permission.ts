import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_employee_contracts_view_other_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts: manager and regular employee
  const managerConnection: api.IConnection = { host: connection.host };
  const managerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Manager123!",
    display_name: "Manager User",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmsMember.IJoin;
  const managerAuth = await authorize_member_join(managerConnection, {
    body: managerJoinInput,
  });
  typia.assert(managerAuth);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Employee123!",
    display_name: "Employee User",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmsMember.IJoin;
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: employeeJoinInput,
  });
  typia.assert(employeeAuth);
  // 2. Create organization memberships for both members (using random organization ID)
  const randomOrganizationId = typia.random<string & tags.Format<"uuid">>();
  // Create organization membership for manager (simplified - using random role IDs)
  const randomRoleId = typia.random<string & tags.Format<"uuid">>();
  const managerMembershipBody = {
    hrms_member_id: managerAuth.id,
    hrms_organization_id: randomOrganizationId,
    hrms_organization_role_id: randomRoleId,
  } satisfies IHrmsOrganizationMember.ICreate;
  const managerMembership =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      { body: managerMembershipBody },
    );
  typia.assert(managerMembership);
  // Create organization membership for employee
  const employeeMembershipBody = {
    hrms_member_id: employeeAuth.id,
    hrms_organization_id: randomOrganizationId,
    hrms_organization_role_id: randomRoleId,
  } satisfies IHrmsOrganizationMember.ICreate;
  const employeeMembership =
    await api.functional.hrms.member.organization_members.create(
      employeeConnection,
      { body: employeeMembershipBody },
    );
  typia.assert(employeeMembership);
  // 3. Create multiple contracts for the employee using manager's connection
  const contractCount = 3;
  const createdContracts: IHrmsEmployeeContract[] = [];
  const payPeriods = ["hourly", "weekly", "monthly"] as const;
  for (let i = 0; i < contractCount; i++) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - i * 12);
    const contractBody = {
      start_date: startDate.toISOString(),
      pay_rate: 5000 + i * 1000,
      pay_period: payPeriods[i % 3] as
        | "hourly"
        | "weekly"
        | "monthly",
      working_hours_per_week: 40,
      notes: `Contract ${i + 1} - Test contract`,
    } satisfies IHrmsEmployeeContract.ICreate;
    const created = await api.functional.hrms.member.employees.contracts.create(
      managerConnection,
      {
        employeeId: employeeMembership.member.id,
        body: contractBody,
      },
    );
    typia.assert(created);
    createdContracts.push(created);
  }
  // 4. Manager calls the contracts endpoint with the employee's ID
  const contractsRequestBody: IHrmsEmployeeContract.IRequest = {};
  const contractsResponse =
    await api.functional.hrms.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: employeeMembership.member.id,
        body: contractsRequestBody,
      },
    );
  typia.assert(contractsResponse);
  // 5. Validate that the manager can successfully view the other employee's contracts
  TestValidator.equals(
    "contracts retrieved",
    contractsResponse.data.length,
    contractCount,
  );
  // 6. Verify that the response includes all contracts with proper contract details and pagination
  TestValidator.equals(
    "pagination current",
    contractsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    contractsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    contractsResponse.pagination.records,
    contractCount,
  );
  TestValidator.equals(
    "pagination pages",
    contractsResponse.pagination.pages,
    1,
  );
  // Verify each contract has correct details
  for (const contract of contractsResponse.data) {
    const safeContract = typia.assert<IHrmsEmployeeContract>(contract);
    TestValidator.equals(
      "contract has employee id",
      safeContract.employee.id,
      employeeMembership.member.id,
    );
    TestValidator.predicate(
      "contract has valid pay rate",
      safeContract.payRate > 0,
    );
    TestValidator.predicate(
      "contract has valid working hours",
      safeContract.workingHoursPerWeek > 0,
    );
  }
  // 7. Test that a regular employee can view their own contracts
  const ownContractsResponse =
    await api.functional.hrms.member.employees.contracts.index(
      employeeConnection,
      {
        employeeId: employeeMembership.member.id,
        body: contractsRequestBody,
      },
    );
  typia.assert(ownContractsResponse);
  TestValidator.equals(
    "employee can view own contracts",
    ownContractsResponse.data.length,
    contractCount,
  );
  // Test that employee cannot view manager's contracts (if manager has contracts)
  const managerId = managerMembership.member.id;
  const managerContractsRequestBody: IHrmsEmployeeContract.IRequest = {};
  const managerContractsResponse =
    await api.functional.hrms.member.employees.contracts.index(
      employeeConnection,
      {
        employeeId: managerId,
        body: managerContractsRequestBody,
      },
    );
  typia.assert(managerContractsResponse);
  TestValidator.equals(
    "employee cannot view manager's contracts",
    managerContractsResponse.data.length,
    0,
  );
}