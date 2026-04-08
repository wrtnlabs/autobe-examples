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
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_contracts_snapshot } from "../../../prepare/prepare_random_hrm_platform_contracts_snapshot";

export async function test_api_contract_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a contract for the employee (member is organization owner = employee)
  const contract = await generate_random_hrm_platform_member_contracts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        end_date: undefined,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
        compensation_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        status: "active" as const,
        notes: RandomGenerator.paragraph(),
        employee_id: memberAuth.member.id,
        organization_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract);
  // Step 3: Create a snapshot of the contract
  const snapshot =
    await generate_random_hrm_platform_member_contracts_snapshots_create(
      memberConnection,
      {
        params: {
          contractId: contract.id,
        },
        body: {} satisfies IHrmPlatformContractsSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Step 4: Retrieve the snapshot
  const retrievedSnapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.at(
      memberConnection,
      {
        contractId: contract.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Step 5: Validate the snapshot
  TestValidator.equals("snapshot id", retrievedSnapshot.id, snapshot.id);
  TestValidator.equals(
    "contract id match",
    retrievedSnapshot.hrm_platform_contract_id,
    contract.id,
  );
  TestValidator.equals(
    "contract number",
    retrievedSnapshot.contract_number,
    snapshot.contract_number,
  );
  TestValidator.equals(
    "start date",
    retrievedSnapshot.start_date,
    snapshot.start_date,
  );
  TestValidator.equals(
    "end date",
    retrievedSnapshot.end_date,
    snapshot.end_date,
  );
  TestValidator.equals(
    "job title",
    retrievedSnapshot.job_title,
    snapshot.job_title,
  );
  TestValidator.equals(
    "work type",
    retrievedSnapshot.work_type,
    snapshot.work_type,
  );
  TestValidator.equals(
    "compensation amount",
    retrievedSnapshot.compensation_amount,
    snapshot.compensation_amount,
  );
  TestValidator.equals(
    "compensation currency",
    retrievedSnapshot.compensation_currency,
    snapshot.compensation_currency,
  );
  TestValidator.equals(
    "compensation frequency",
    retrievedSnapshot.compensation_frequency,
    snapshot.compensation_frequency,
  );
  TestValidator.equals(
    "created at",
    retrievedSnapshot.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "updated at",
    retrievedSnapshot.updated_at,
    snapshot.updated_at,
  );
  TestValidator.equals(
    "snapshotted at",
    retrievedSnapshot.snapshotted_at,
    snapshot.snapshotted_at,
  );
  // Validate optional fields are returned (may be null)
  TestValidator.equals(
    "benefits description",
    retrievedSnapshot.benefits_description,
    snapshot.benefits_description,
  );
  TestValidator.equals(
    "probation period",
    retrievedSnapshot.probation_period_days,
    snapshot.probation_period_days,
  );
  TestValidator.equals(
    "notice period",
    retrievedSnapshot.notice_period_days,
    snapshot.notice_period_days,
  );
  TestValidator.equals(
    "work location",
    retrievedSnapshot.work_location,
    snapshot.work_location,
  );
  TestValidator.equals("notes", retrievedSnapshot.notes, snapshot.notes);
}
