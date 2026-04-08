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

/**
 * Test that contract snapshots correctly preserve null department references when department was not assigned at snapshot time.
 *
 * Validates the complete contract snapshot workflow including member authentication, contract creation without department assignment, snapshot creation, and snapshot retrieval. Ensures that the snapshot correctly handles null department_id references and preserves all other required fields.
 *
 * Special attention is given to verifying that the snapshot can be retrieved successfully even with null department reference, and that the denormalized snapshot data maintains integrity when department is null.
 *
 * 1. Member registers with organization via POST /hrmPlatform/auth/member/join.
 * 2. Contract is created for an employee without department assignment.
 * 3. Snapshot captures the contract state with null department_id.
 * 4. Snapshot is retrieved via GET endpoint.
 * 5. Validates department_id is explicitly null in snapshot response.
 * 6. Verifies all other required fields (job_title, compensation, work_type, etc.) are properly populated.
 * 7. Confirms system correctly handles null references in denormalized snapshot data.
 */
export async function test_api_contract_snapshot_null_department_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  const member: IHrmPlatformMember.ISummary = memberAuth.member;
  // 2. Create contract without department assignment using generate utility
  const contractConnection: api.IConnection = { host: connection.host };
  const contract: IHrmPlatformContract =
    await generate_random_hrm_platform_member_contracts_create(
      contractConnection,
      {
        body: {
          title: "Employment Contract",
          start_date: new Date().toISOString(),
          status: "active",
          compensation_amount: 5000000,
          compensation_currency: "KRW",
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          organization_id: "00000000-0000-0000-0000-000000000000",
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(contract);
  // 3. Create snapshot of the contract
  const snapshot: IHrmPlatformContractsSnapshot =
    await generate_random_hrm_platform_member_contracts_snapshots_create(
      contractConnection,
      {
        params: {
          contractId: contract.id,
        },
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot via GET endpoint
  const retrievedSnapshot: IHrmPlatformContractsSnapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.at(
      contractConnection,
      {
        contractId: contract.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate null department handling - department_id should be explicitly null
  TestValidator.equals(
    "department_id is null in snapshot",
    retrievedSnapshot.department_id,
    null,
  );
  // 6. Validate other required fields are properly populated
  TestValidator.predicate(
    "job_title exists and is non-empty",
    retrievedSnapshot.job_title.length > 0,
  );
  TestValidator.predicate(
    "compensation_amount is valid non-negative",
    retrievedSnapshot.compensation_amount >= 0,
  );
  TestValidator.predicate(
    "compensation_currency exists and is non-empty",
    retrievedSnapshot.compensation_currency.length > 0,
  );
  TestValidator.predicate(
    "work_type exists and is non-empty",
    retrievedSnapshot.work_type.length > 0,
  );
  TestValidator.predicate(
    "contract_number exists and is non-empty",
    retrievedSnapshot.contract_number.length > 0,
  );
  TestValidator.predicate(
    "start_date is valid ISO date-time",
    new Date(retrievedSnapshot.start_date).toISOString().length > 0,
  );
  // 7. Validate snapshot timestamps are valid
  TestValidator.predicate(
    "snapshotted_at is valid date-time",
    new Date(snapshot.snapshotted_at).toISOString().length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(snapshot.created_at).toISOString().length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(snapshot.updated_at).toISOString().length > 0,
  );
  // 8. Validate snapshot reference to parent contract
  TestValidator.equals(
    "snapshot links to parent contract",
    retrievedSnapshot.hrm_platform_contract_id,
    contract.id,
  );
  // 9. Verify snapshot data integrity with null department
  TestValidator.equals(
    "snapshot has correct contract number",
    retrievedSnapshot.contract_number,
    snapshot.contract_number,
  );
  TestValidator.equals(
    "snapshot has correct job title",
    retrievedSnapshot.job_title,
    snapshot.job_title,
  );
  TestValidator.equals(
    "snapshot has correct compensation amount",
    retrievedSnapshot.compensation_amount,
    snapshot.compensation_amount,
  );
}