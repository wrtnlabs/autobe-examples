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

export async function test_api_contract_deletion_active_contract_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an active employment contract
  // Note: In a real scenario, we would need to create an employee first.
  // Since employee creation utilities are not available, we use a UUID placeholder.
  // This test validates the contract deletion logic assuming an employee exists.
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contract = await generate_random_hrm_member_employees_contracts_create(
    memberConnection,
    {
      body: {
        start_date: new Date().toISOString(),
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: "monthly",
        end_date: null, // Active contract (end_date is NULL)
      } satisfies IHrmContract.ICreate,
      params: {
        employeeId,
      },
    },
  );
  typia.assert(contract);
  // 3. Verify the contract is active (end_date is NULL)
  TestValidator.predicate("contract is active", contract.end_date === null);
  // 4. Attempt to delete the active contract - should fail with 409 Conflict
  await TestValidator.httpError(
    "cannot delete active contract",
    409,
    async () => {
      await api.functional.hrm.member.employees.contracts.erase(
        memberConnection,
        {
          employeeId,
          contractId: contract.id,
        },
      );
    },
  );
}
