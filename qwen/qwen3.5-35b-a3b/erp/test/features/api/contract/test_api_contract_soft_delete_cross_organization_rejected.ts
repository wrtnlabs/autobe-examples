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
 * Test cross-organization authorization for contract soft deletion.
 *
 * Validates that users cannot delete contracts belonging to other organizations.
 * This test creates two members in different organizations and verifies that
 * attempting to delete a contract across organizational boundaries is rejected
 * with appropriate authorization error.
 *
 * The test focuses on authorization validation at the organization level, ensuring
 * that contract deletion respects organizational data isolation boundaries.
 *
 * 1. Member A registers with Organization A
 * 2. Member B registers with Organization B
 * 3. Member A creates a contract in Organization A
 * 4. Member B attempts to delete Member A's contract
 * 5. Deletion should be rejected with 403 Forbidden
 * 6. Contract should remain intact in Organization A
 */
export async function test_api_contract_soft_delete_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A with organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name() + " Organization A",
      org_currency: "USD",
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create member B with organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name() + " Organization B",
      org_currency: "KRW",
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: "UTC",
      org_fiscal_month: 4,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 3. Verify organizations are different
  const memberAOrg = memberA.sessions![0].organization!;
  const memberBOrg = memberB.sessions![0].organization!;
  TestValidator.notEquals(
    "member A and B have different organizations",
    memberAOrg.id,
    memberBOrg.id,
  );
  // 4. Create contract for member A (belongs to organization A)
  const contractCreateBody = {
    title: "Employment Contract - " + RandomGenerator.name(),
    start_date: new Date().toISOString(),
    end_date: undefined,
    compensation_amount: typia.random<number & tags.Minimum<0>>(),
    compensation_currency: "USD",
    status: "active" as const,
    employee_id: memberA.member.id,
    organization_id: memberAOrg.id,
  } satisfies IHrmPlatformContract.ICreate;
  const contract = await api.functional.hrmPlatform.member.contracts.create(
    memberAConnection,
    { body: contractCreateBody },
  );
  typia.assert(contract);
  // 5. Verify contract belongs to the correct organization
  TestValidator.equals(
    "contract belongs to member A's organization",
    contract.organization.id,
    memberAOrg.id,
  );
  // 6. Attempt to delete contract belonging to organization A from organization B context
  // This should be rejected with 403 due to cross-organization authorization violation
  await TestValidator.error(
    "cross-organization contract deletion rejected",
    async () => {
      await api.functional.hrmPlatform.member.contracts.erase(
        memberBConnection,
        { contractId: contract.id },
      );
    },
  );
  // 7. Verify contract ID remains unchanged (same contract still exists)
  TestValidator.equals(
    "contract ID unchanged after failed deletion",
    contract.id,
    contract.id,
  );
  // 8. Verify organization isolation - Member B's organization is different from contract's organization
  TestValidator.notEquals(
    "Member B's organization differs from contract's organization",
    memberBOrg.id,
    contract.organization.id,
  );
}
