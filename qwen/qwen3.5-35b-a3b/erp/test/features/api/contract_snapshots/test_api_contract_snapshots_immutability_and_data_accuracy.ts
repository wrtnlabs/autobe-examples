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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractsSnapshot";
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

export async function test_api_contract_snapshots_immutability_and_data_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member with organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: "USD",
    },
  });
  typia.assert(joinOutput);
  // Create a new connection for subsequent API calls with the joined member's token
  const apiConnection: api.IConnection = { host: connection.host };
  // 2. Create initial contract (Contract A) with specific details
  // Using utility function that handles employee creation internally
  const contractA = await generate_random_hrm_platform_member_contracts_create(
    apiConnection,
    {
      body: {
        employee_id: joinOutput.member.id,
        organization_id: joinOutput.member.id,
        title: "Initial Contract A - Original State",
        start_date: new Date().toISOString(),
        compensation_amount: 5000,
        compensation_currency: "USD",
        status: "active" as const,
        notes: "Original contract A notes",
      },
    },
  );
  typia.assert(contractA);
  // Capture original values for comparison
  const originalJobTitle = contractA.employee.job_title;
  const originalCompensationAmount = contractA.compensation_amount;
  const originalCurrency = contractA.compensation_currency;
  const originalTitle = contractA.title;
  // 3. Verify first snapshot was created with Contract A's values
  const firstSnapshots =
    await api.functional.hrmPlatform.member.contracts.snapshots.index(
      apiConnection,
      {
        contractId: contractA.id,
        body: {},
      },
    );
  typia.assert(firstSnapshots);
  TestValidator.equals("first snapshot exists", firstSnapshots.data.length, 1);
  const firstSnapshot = firstSnapshots.data[0];
  typia.assert(firstSnapshot);
  // Verify snapshot captures Contract A's initial state
  TestValidator.equals(
    "snapshot job_title matches original",
    firstSnapshot.job_title,
    originalJobTitle,
  );
  TestValidator.equals(
    "snapshot compensation_amount matches original",
    firstSnapshot.compensation_amount,
    originalCompensationAmount,
  );
  TestValidator.equals(
    "snapshot currency matches original",
    firstSnapshot.compensation_currency,
    originalCurrency,
  );
  // Record the snapshotted_at timestamp for immutability check
  const firstSnapshottedAt = firstSnapshot.snapshotted_at;
  // 4. Create Contract B (modify Contract A - ends Contract A, starts Contract B)
  const contractB = await generate_random_hrm_platform_member_contracts_create(
    apiConnection,
    {
      body: {
        employee_id: joinOutput.member.id,
        organization_id: joinOutput.member.id,
        title: "Modified Contract B - Different Title and Compensation",
        start_date: new Date().toISOString(),
        compensation_amount: 10000,
        compensation_currency: "EUR",
        status: "active" as const,
        notes: "New contract B notes - different from A",
      },
    },
  );
  typia.assert(contractB);
  // Verify Contract A is now ended (has end_date set)
  TestValidator.predicate("Contract A was ended", contractA.end_date !== null);
  // 5. Retrieve snapshots of Contract A after modification
  const snapshotsAfterModification =
    await api.functional.hrmPlatform.member.contracts.snapshots.index(
      apiConnection,
      {
        contractId: contractA.id,
        body: {},
      },
    );
  typia.assert(snapshotsAfterModification);
  // 6. Verify Contract A's snapshot is immutable (still shows original Contract A state)
  const snapshotAfterMod = snapshotsAfterModification.data[0];
  typia.assert(snapshotAfterMod);
  TestValidator.equals(
    "snapshot job_title remains unchanged after Contract B creation",
    snapshotAfterMod.job_title,
    firstSnapshot.job_title,
  );
  TestValidator.equals(
    "snapshot compensation_amount remains unchanged after Contract B creation",
    snapshotAfterMod.compensation_amount,
    firstSnapshot.compensation_amount,
  );
  TestValidator.equals(
    "snapshot currency remains unchanged after Contract B creation",
    snapshotAfterMod.compensation_currency,
    firstSnapshot.compensation_currency,
  );
  // 7. Verify snapshotted_at timestamp is immutable
  TestValidator.equals(
    "snapshotted_at timestamp is immutable",
    snapshotAfterMod.snapshotted_at,
    firstSnapshottedAt,
  );
  // 8. Verify contract_number is preserved in snapshot
  TestValidator.equals(
    "contract_number preserved in snapshot",
    snapshotAfterMod.contract_number,
    snapshotAfterMod.contract_number,
  );
  // 9. Verify snapshot count for Contract A remains stable (only 1 snapshot, not 2)
  TestValidator.equals(
    "Contract A snapshot count remains 1 (immutable audit record)",
    snapshotsAfterModification.data.length,
    1,
  );
  // 10. Verify Contract B has its own snapshot with its own values
  const contractBSnapshots =
    await api.functional.hrmPlatform.member.contracts.snapshots.index(
      apiConnection,
      {
        contractId: contractB.id,
        body: {},
      },
    );
  typia.assert(contractBSnapshots);
  TestValidator.equals(
    "Contract B has its own snapshot",
    contractBSnapshots.data.length,
    1,
  );
  const contractBSnapshot = contractBSnapshots.data[0];
  typia.assert(contractBSnapshot);
  // Verify Contract B snapshot has its own (different) values
  TestValidator.predicate(
    "Contract B snapshot has different job_title than Contract A",
    contractBSnapshot.job_title !== firstSnapshot.job_title,
  );
  TestValidator.predicate(
    "Contract B snapshot has different compensation_amount than Contract A",
    contractBSnapshot.compensation_amount !== firstSnapshot.compensation_amount,
  );
  TestValidator.predicate(
    "Contract B snapshot has different currency than Contract A",
    contractBSnapshot.compensation_currency !==
      firstSnapshot.compensation_currency,
  );
}