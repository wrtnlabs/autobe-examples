import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

export async function test_api_contract_retrieval_by_manager_with_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member (member A) with employee:view permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee member (member B) whose contract will be viewed
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Create employment contract for employee B
  // Note: This requires employeeId and organizationId which should be available
  // after member join creates employee records in organizations
  // For this test, we use the contract creation utility which handles the setup
  const contract = await generate_random_hrm_member_employees_contracts_create(
    employeeConnection,
    {
      body: {
        start_date: new Date(Date.now() + 86400000).toISOString(),
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: typia.random<
          "hourly" | "daily" | "weekly" | "monthly"
        >(),
        working_hours_per_week: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<80>
        >(),
        notes: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmContract.ICreate,
      params: {
        employeeId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(contract);
  // 4. Manager retrieves employee B's contract using the GET endpoint
  const retrievedContract =
    await api.functional.hrm.member.organizations.employees.contracts.at(
      managerConnection,
      {
        organizationId: contract.employee.organization.id,
        employeeId: contract.employee.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 5. Validate contract details match
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedContract.employee.id,
    contract.employee.id,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedContract.employee.organization.id,
    contract.employee.organization.id,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "pay rate matches",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrievedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.predicate(
    "working hours is valid",
    retrievedContract.working_hours_per_week === null ||
      retrievedContract.working_hours_per_week > 0,
  );
  TestValidator.predicate(
    "contract has notes",
    retrievedContract.notes !== null && retrievedContract.notes !== undefined,
  );
}