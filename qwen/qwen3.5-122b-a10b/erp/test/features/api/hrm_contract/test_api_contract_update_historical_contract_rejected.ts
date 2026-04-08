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

/**
 * Test that updating a historical employment contract is rejected.
 *
 * Validates the business rule that employment contracts with an end_date set (indicating they are past/historical contracts) cannot be modified. This preserves audit trail integrity for compliance and historical record-keeping purposes.
 *
 * The test creates a contract with an end_date already set (making it historical from creation), then attempts to update it and verifies the system rejects the modification with a 400 error.
 *
 * 1. Register a new member with email and password credentials.
 * 2. Create an employment contract with end_date set (historical contract).
 * 3. Attempt to update the historical contract's pay_rate field.
 * 4. Verify the update request is rejected with HTTP 400 error.
 */
export async function test_api_contract_update_historical_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // Generate a random employee ID (in real scenario, employee would be created first)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a historical contract with end_date already set
  // This simulates a past contract that should be immutable
  const historicalContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        body: {
          start_date: new Date(Date.now() - 86400000 * 365).toISOString(), // 1 year ago
          end_date: new Date(Date.now() - 86400000 * 180).toISOString(), // 6 months ago (ended)
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          notes: "Historical contract for testing immutability",
        } satisfies IHrmContract.ICreate,
        params: {
          employeeId,
        },
      },
    );
  typia.assert(historicalContract);
  // Verify the contract is historical (has end_date set)
  TestValidator.predicate(
    "contract is historical",
    historicalContract.end_date !== null,
  );
  // 3. Attempt to update the historical contract (should be rejected)
  await TestValidator.httpError(
    "updating historical contract should be rejected with 400 error",
    400,
    async () => {
      await api.functional.hrm.member.employees.contracts.update(
        memberConnection,
        {
          employeeId,
          contractId: historicalContract.id,
          body: {
            pay_rate: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IHrmContract.IUpdate,
        },
      );
    },
  );
}
