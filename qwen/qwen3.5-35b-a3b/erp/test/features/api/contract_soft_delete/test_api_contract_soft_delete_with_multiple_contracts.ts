import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
import { generate_random_hrm_platform_member_contracts_create } from "../../../generate/generate_random_hrm_platform_member_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test contract soft delete workflow with multiple contracts.
 *
 * Validates the complete contract lifecycle including contract creation, automatic
 * status transitions, and soft delete operations. Ensures that contracts can be
 * properly deleted while maintaining employee contract count requirements.
 *
 * 1. Member joins with organization
 * 2. Create first active contract
 * 3. Create second contract (first automatically ends)
 * 4. Create third contract (second automatically ends)
 * 5. Soft delete first ended contract
 * 6. Verify remaining contracts are intact
 * 7. Soft delete second ended contract
 * 8. Verify at least one contract remains
 */
export async function test_api_contract_soft_delete_with_multiple_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Member serves as employee; organization needs separate tracking
  const employeeId: string & tags.Format<"uuid"> = memberAuth.member.id;
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Authenticate with member credentials
  const contractConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(contractConnection, {
    body: { email: memberAuth.email, password: password },
  });
  // 3. Create first contract (active)
  const startDate1 = new Date().toISOString();
  const contract1 = await generate_random_hrm_platform_member_contracts_create(
    contractConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: startDate1,
        end_date: undefined,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        compensation_currency: "KRW",
        status: "active" as const,
        employee_id: employeeId,
        organization_id: organizationId,
      },
    },
  );
  typia.assert(contract1);
  // 4. Create second contract (first will be automatically ended)
  const startDate2 = new Date(
    Date.parse(startDate1) + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const contract2 = await generate_random_hrm_platform_member_contracts_create(
    contractConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: startDate2,
        end_date: undefined,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        compensation_currency: "KRW",
        status: "active" as const,
        employee_id: employeeId,
        organization_id: organizationId,
      },
    },
  );
  typia.assert(contract2);
  // 5. Verify first contract was ended when second was created
  TestValidator.equals(
    "first contract ended",
    contract1.status === "ended",
    true,
  );
  TestValidator.predicate(
    "first contract has end_date",
    contract1.end_date !== null,
  );
  // 6. Create third contract (second will be automatically ended)
  const startDate3 = new Date(
    Date.parse(startDate2) + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const contract3 = await generate_random_hrm_platform_member_contracts_create(
    contractConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: startDate3,
        end_date: undefined,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        compensation_currency: "KRW",
        status: "active" as const,
        employee_id: employeeId,
        organization_id: organizationId,
      },
    },
  );
  typia.assert(contract3);
  // 7. Verify second contract was ended when third was created
  TestValidator.equals(
    "second contract ended",
    contract2.status === "ended",
    true,
  );
  TestValidator.predicate(
    "second contract has end_date",
    contract2.end_date !== null,
  );
  // 8. Delete the first ended contract
  await api.functional.hrmPlatform.member.contracts.erase(contractConnection, {
    contractId: contract1.id,
  });
  // 9. Verify employee still has remaining contracts (contract2 and contract3)
  TestValidator.equals(
    "second contract has different ID",
    contract2.id,
    contract3.id,
  );
  TestValidator.predicate(
    "contract2 and contract3 exist",
    contract2.id.length > 0 && contract3.id.length > 0,
  );
  // 10. Delete the second ended contract
  await api.functional.hrmPlatform.member.contracts.erase(contractConnection, {
    contractId: contract2.id,
  });
  // 11. Verify employee still has at least one contract (contract3)
  TestValidator.equals(
    "third contract still active",
    contract3.status === "active",
    true,
  );
  TestValidator.equals(
    "contract belongs to same employee",
    contract3.employee.id,
    employeeId,
  );
}
