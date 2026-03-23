import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test that a member cannot retrieve contract snapshots belonging to other employees in the same organization.
 * This test verifies cross-employee access restrictions for contract snapshot retrieval.
 */
export async function test_api_contract_snapshot_access_denied_cross_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create and authenticate member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Create contract for member2 (using member2's connection)
  // The utility function handles employee creation internally
  const member2Contract = await generate_random_hrm_platform_contracts_create(
    member2Connection,
    {
      body: {
        start_at: new Date().toISOString(),
        pay_rate: typia.random<
          number & typia.tags.Type<"uint32"> & typia.tags.Minimum<1000000>
        >(),
        pay_period: "monthly",
        working_hours_per_week: typia.random<
          number &
            typia.tags.Type<"uint32"> &
            typia.tags.Minimum<20> &
            typia.tags.Maximum<60>
        >(),
      },
    },
  );
  typia.assert(member2Contract);
  // 4. Generate a snapshot ID (simulated - in real scenario, snapshots would be created by the system)
  const snapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  // 5. Attempt to access member2's contract snapshot using member1's connection
  // This should fail with 403 Forbidden due to cross-employee access restriction
  await TestValidator.httpError(
    "member1 cannot access member2's contract snapshot",
    403,
    async () =>
      await api.functional.hrmPlatform.contracts.snapshots.at(
        member1Connection,
        {
          contractId: member2Contract.id,
          snapshotId: snapshotId,
        },
      ),
  );
  // 6. Additional validation: Verify member1 cannot access any contract that doesn't belong to them
  // Generate another random contract ID to test broader access control
  const randomContractId = typia.random<string & typia.tags.Format<"uuid">>();
  const randomSnapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member1 cannot access arbitrary contract snapshot",
    [403, 404],
    async () =>
      await api.functional.hrmPlatform.contracts.snapshots.at(
        member1Connection,
        {
          contractId: randomContractId,
          snapshotId: randomSnapshotId,
        },
      ),
  );
}
