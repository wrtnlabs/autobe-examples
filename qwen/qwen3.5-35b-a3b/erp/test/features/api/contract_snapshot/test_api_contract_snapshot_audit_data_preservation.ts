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

export async function test_api_contract_snapshot_audit_data_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "KRW",
      org_timezone: "Asia/Seoul",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create initial contract with specific values
  // Note: employee_id and organization_id will be filled in by prepare_random_hrm_platform_contract
  const initialContract =
    await generate_random_hrm_platform_member_contracts_create(
      memberConnection,
      {
        body: {
          title: "Employment Contract",
          start_date: new Date().toISOString(),
          end_date: undefined,
          compensation_amount: 8000000,
          compensation_currency: "KRW",
          status: "active" as const,
          employee_id: authResult.member.id,
        },
      },
    );
  typia.assert(initialContract);
  const contractId = initialContract.id;
  // 3. Create first snapshot to capture initial state
  const firstSnapshot =
    await generate_random_hrm_platform_member_contracts_snapshots_create(
      memberConnection,
      {
        params: { contractId },
        body: {},
      },
    );
  typia.assert(firstSnapshot);
  const firstSnapshotId = firstSnapshot.id;
  const firstSnapshottedAt = firstSnapshot.snapshotted_at;
  // 4. Update contract with new values (simulating contract modification after snapshot)
  const updatedContract =
    await api.functional.hrmPlatform.member.contracts.update(memberConnection, {
      contractId,
      body: {
        compensation_amount: 10000000,
        notes: "Contract updated with new terms",
      },
    });
  typia.assert(updatedContract);
  const updateTimestamp = updatedContract.updated_at;
  // 5. Create second snapshot to capture updated state
  const secondSnapshot =
    await generate_random_hrm_platform_member_contracts_snapshots_create(
      memberConnection,
      {
        params: { contractId },
        body: {},
      },
    );
  typia.assert(secondSnapshot);
  const secondSnapshotId = secondSnapshot.id;
  // 6. Retrieve the first snapshot and verify it contains ORIGINAL values (not updated)
  const retrievedFirstSnapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.at(
      memberConnection,
      {
        contractId,
        snapshotId: firstSnapshotId,
      },
    );
  typia.assert(retrievedFirstSnapshot);
  // 7. Verify the first snapshot has the ORIGINAL compensation amount (8000000, not 10000000)
  TestValidator.equals(
    "first snapshot compensation is original value",
    retrievedFirstSnapshot.compensation_amount,
    8000000,
  );
  // 8. Verify the first snapshot has original currency
  TestValidator.equals(
    "first snapshot compensation currency",
    retrievedFirstSnapshot.compensation_currency,
    "KRW",
  );
  // 9. Verify the first snapshot has original frequency
  TestValidator.equals(
    "first snapshot compensation frequency",
    retrievedFirstSnapshot.compensation_frequency,
    "monthly",
  );
  // 10. Verify the first snapshot snapshotted_at is before the contract update
  TestValidator.predicate(
    "first snapshot timestamp is before contract update",
    firstSnapshottedAt < updateTimestamp,
  );
  // 11. Verify the second snapshot has the UPDATED values (10000000)
  const retrievedSecondSnapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.at(
      memberConnection,
      {
        contractId,
        snapshotId: secondSnapshotId,
      },
    );
  typia.assert(retrievedSecondSnapshot);
  TestValidator.equals(
    "second snapshot compensation is updated value",
    retrievedSecondSnapshot.compensation_amount,
    10000000,
  );
  // 12. Verify the two snapshots are different (proving snapshots are immutable and distinct)
  TestValidator.notEquals(
    "snapshots have different compensation amounts",
    retrievedFirstSnapshot.compensation_amount,
    retrievedSecondSnapshot.compensation_amount,
  );
}
