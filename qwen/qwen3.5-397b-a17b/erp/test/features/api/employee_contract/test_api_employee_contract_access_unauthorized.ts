import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employees_contracts_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

export async function test_api_employee_contract_access_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (contract owner)
  const memberAAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create member A's connection for subsequent operations
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: `Bearer ${memberAAuth.token.access}`,
  };
  // 3. Create employee record for member A
  const employeeA = await generate_random_hrm_platform_member_employees_create(
    memberAConnection,
    {
      body: {
        member_id: memberAAuth.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employeeA);
  // 4. Create contract for member A's employee record
  const contractA =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberAConnection,
      {
        params: { employeeId: employeeA.id },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<80>
          >(),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contractA);
  // 5. Create member B (unauthorized user)
  const memberBAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 6. Create member B's connection
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: `Bearer ${memberBAuth.token.access}`,
  };
  // 7. Attempt to access member A's contract using member B's credentials (should fail)
  await TestValidator.httpError(
    "unauthorized contract access",
    [401, 403],
    async () => {
      await api.functional.hrmPlatform.member.employees.contracts.at(
        memberBConnection,
        {
          employeeId: employeeA.id,
          contractId: contractA.id,
        },
      );
    },
  );
}