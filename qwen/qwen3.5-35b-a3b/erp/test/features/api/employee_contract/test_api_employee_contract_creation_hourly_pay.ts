import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";

export async function test_api_employee_contract_creation_hourly_pay(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create new connection with the authenticated member token
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  memberAuthenticatedConnection.headers = {
    ...memberAuthenticatedConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Create employment contract with hourly pay period
  const contract = await generate_random_hrms_member_employees_contracts_create(
    memberAuthenticatedConnection,
    {
      body: {
        start_date: new Date().toISOString(),
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: "hourly" as const,
        working_hours_per_week: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        notes: "Test hourly contract",
      } satisfies IHrmsEmployeeContract.ICreate,
    },
  );
  typia.assert(contract);
  // 4. Validate contract was created successfully
  TestValidator.predicate(
    "contract has valid id",
    contract.id !== undefined && contract.id.length > 0,
  );
  TestValidator.predicate(
    "contract hrmsEmployeeId exists",
    contract.hrmsEmployeeId !== undefined && contract.hrmsEmployeeId.length > 0,
  );
  TestValidator.predicate(
    "contract has employee reference",
    contract.employee?.id !== undefined && contract.employee.id.length > 0,
  );
  // 5. Validate contract is active (end_date should be null)
  TestValidator.equals(
    "contract is active (end_date is null)",
    contract.endDate,
    null,
  );
  // 6. Validate pay_period is 'hourly'
  TestValidator.equals("pay period is hourly", contract.payPeriod, "hourly");
  // 7. Validate pay rate is positive
  TestValidator.predicate("pay rate is positive", contract.payRate > 0);
  // 8. Validate working hours per week is positive
  TestValidator.predicate(
    "working hours per week is positive",
    contract.workingHoursPerWeek > 0,
  );
  // 9. Validate timestamps are present
  TestValidator.predicate(
    "contract has created_at timestamp",
    contract.createdAt !== undefined && contract.createdAt.length > 0,
  );
  TestValidator.predicate(
    "contract has updated_at timestamp",
    contract.updatedAt !== undefined && contract.updatedAt.length > 0,
  );
  // 10. Validate deleted_at is null (active record)
  TestValidator.equals(
    "contract is not deleted (deleted_at is null)",
    contract.deletedAt,
    null,
  );
  // 11. Validate notes field is preserved
  TestValidator.equals(
    "contract notes field is preserved",
    contract.notes,
    "Test hourly contract",
  );
}
