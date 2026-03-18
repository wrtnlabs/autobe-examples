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

export async function test_api_employee_contracts_view_own_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create multiple contracts for the employee
  const employeeId = member.organization_memberships[0].member.id;
  const contractsConnection: api.IConnection = { host: connection.host };
  // Create past contract with past end date
  const pastStartDate = new Date(
    new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastContract =
    await api.functional.hrms.member.employees.contracts.create(
      contractsConnection,
      {
        employeeId,
        body: {
          start_date: pastStartDate,
          pay_rate: typia.random<
            number & tags.Type<"double"> & tags.Minimum<1>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ]),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
        } satisfies IHrmsEmployeeContract.ICreate,
      },
    );
  typia.assert(pastContract);
  // Create active contract (no end date)
  const activeStartDate = new Date().toISOString();
  const activeContract =
    await api.functional.hrms.member.employees.contracts.create(
      contractsConnection,
      {
        employeeId,
        body: {
          start_date: activeStartDate,
          pay_rate: typia.random<
            number & tags.Type<"double"> & tags.Minimum<1>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ]),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
        } satisfies IHrmsEmployeeContract.ICreate,
      },
    );
  typia.assert(activeContract);
  // 3. Retrieve employee's contract history
  const contractsResponse =
    await api.functional.hrms.member.employees.contracts.index(
      contractsConnection,
      {
        employeeId,
        body: {},
      },
    );
  typia.assert(contractsResponse);
  // 4. Validate response contains both contracts
  TestValidator.equals(
    "contracts count matches",
    contractsResponse.data.length,
    2,
  );
  // 5. Verify both active and past contracts are present
  const contractIds = contractsResponse.data.map((c) => c.id);
  TestValidator.equals(
    "past contract included",
    contractIds.includes(pastContract.id),
    true,
  );
  TestValidator.equals(
    "active contract included",
    contractIds.includes(activeContract.id),
    true,
  );
  // 6. Validate each contract has required fields
  contractsResponse.data.forEach((contract) => {
    typia.assert(contract);
    TestValidator.predicate("contract has valid id", contract.id !== undefined);
    TestValidator.predicate(
      "contract has employee",
      contract.employee !== undefined,
    );
    TestValidator.predicate(
      "contract has pay period",
      ["hourly", "daily", "weekly", "monthly"].includes(contract.pay_period),
    );
  });
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    contractsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    contractsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches total",
    contractsResponse.pagination.records,
    2,
  );
  TestValidator.predicate(
    "pagination pages valid",
    contractsResponse.pagination.pages >= 1,
  );
}
