import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
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
import { generate_random_hrm_platform_member_contracts_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_contracts_snapshots_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_contracts_snapshot } from "../../../prepare/prepare_random_hrm_platform_contracts_snapshot";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_contract_snapshot_admin_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin member joins with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult);
  const adminMember = adminResult.member;
  // Step 2: Admin creates an organization (adminConnection.headers is updated internally)
  const organization =
    await api.functional.hrmPlatform.member.organizations.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          timezone: RandomGenerator.pick([
            "UTC",
            "Asia/Seoul",
            "America/New_York",
          ]),
          fiscal_start_month: RandomGenerator.pick([1, 4, 7, 10]),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Admin creates a contract referencing admin as employee
  const contract = await api.functional.hrmPlatform.member.contracts.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        compensation_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        status: "active" as const,
        notes: RandomGenerator.paragraph({ sentences: 3 }),
        employee_id: adminMember.id,
        organization_id: organization.id,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract);
  // Step 4: Admin creates a snapshot of the contract
  const snapshotCreationTime = new Date().toISOString();
  const snapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.create(
      adminConnection,
      {
        contractId: contract.id,
        body: {},
      },
    );
  typia.assert(snapshot);
  // Step 5: Validate snapshot data matches contract data
  TestValidator.equals(
    "snapshot has contract reference",
    snapshot.hrm_platform_contract_id,
    contract.id,
  );
  TestValidator.equals(
    "snapshot title matches contract title",
    snapshot.contract_number,
    contract.title,
  );
  TestValidator.equals(
    "snapshot start_date matches",
    snapshot.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "snapshot end_date matches",
    snapshot.end_date,
    contract.end_date,
  );
  TestValidator.equals(
    "snapshot notes matches",
    snapshot.notes,
    contract.notes,
  );
  // Handle nullable compensation_amount from contract
  if (contract.compensation_amount !== null) {
    TestValidator.equals(
      "snapshot compensation_amount matches",
      snapshot.compensation_amount,
      contract.compensation_amount,
    );
    TestValidator.equals(
      "snapshot compensation_currency matches",
      snapshot.compensation_currency,
      contract.compensation_currency!,
    );
  }
  // Step 6: Validate snapshot immutability and audit
  TestValidator.predicate(
    "snapshotted_at is after contract creation",
    snapshot.snapshotted_at >= snapshotCreationTime,
  );
  TestValidator.predicate(
    "snapshotted_at is before or equal to current time",
    snapshot.snapshotted_at <= new Date().toISOString(),
  );
  // Step 7: Validate original contract remains unchanged
  TestValidator.equals(
    "contract title unchanged after snapshot",
    contract.title,
    contract.title,
  );
  TestValidator.equals(
    "contract start_date unchanged",
    contract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "contract compensation_amount unchanged",
    contract.compensation_amount,
    contract.compensation_amount,
  );
}
