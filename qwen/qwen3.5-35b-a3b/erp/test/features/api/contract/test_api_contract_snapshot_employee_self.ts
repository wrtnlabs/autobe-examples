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

export async function test_api_contract_snapshot_employee_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register employee with organization (creates member + organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      org_timezone: "UTC",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Create contract for the employee (employee_id = member.id)
  // The organization is automatically created by authorize_member_join
  const contract = await api.functional.hrmPlatform.member.contracts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        start_date: new Date().toISOString(),
        end_date: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        compensation_amount: typia.random<number & tags.Minimum<0>>(),
        compensation_currency: "KRW",
        status: "active" as const,
        notes: RandomGenerator.paragraph(),
        employee_id: authorized.member.id,
        organization_id: authorized.member.id,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract);
  // 3. Create snapshot of the contract (self-service by contract owner)
  const snapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.create(
      memberConnection,
      {
        contractId: contract.id,
        body: {} satisfies IHrmPlatformContractsSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains correct contract reference
  TestValidator.equals(
    "snapshot has contract reference",
    snapshot.hrm_platform_contract_id,
    contract.id,
  );
  TestValidator.predicate(
    "snapshot has contract number",
    snapshot.contract_number.length > 0,
  );
  TestValidator.equals(
    "snapshot has start date",
    snapshot.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "snapshot has end date",
    snapshot.end_date,
    contract.end_date,
  );
  TestValidator.equals(
    "snapshot has job title",
    snapshot.job_title,
    contract.title,
  );
  TestValidator.equals(
    "snapshot has compensation amount",
    snapshot.compensation_amount,
    contract.compensation_amount,
  );
  TestValidator.equals(
    "snapshot has compensation currency",
    snapshot.compensation_currency,
    contract.compensation_currency,
  );
  TestValidator.predicate(
    "snapshot has work type",
    snapshot.work_type.length > 0,
  );
  TestValidator.predicate(
    "snapshot has compensation frequency",
    snapshot.compensation_frequency.length > 0,
  );
  // 5. Validate optional snapshot fields
  if (snapshot.department_id !== undefined) {
    TestValidator.predicate(
      "snapshot department id is valid",
      snapshot.department_id !== null && snapshot.department_id !== undefined,
    );
  }
  if (snapshot.benefits_description !== undefined) {
    TestValidator.predicate(
      "snapshot benefits description is string or null",
      typeof snapshot.benefits_description === "string" ||
        snapshot.benefits_description === null,
    );
  }
  if (snapshot.work_location !== undefined) {
    TestValidator.predicate(
      "snapshot work location is string or null",
      typeof snapshot.work_location === "string" ||
        snapshot.work_location === null,
    );
  }
  // 6. Verify snapshot creation order (snapshotted_at should be after contract creation)
  TestValidator.predicate(
    "snapshot created after contract",
    new Date(snapshot.snapshotted_at) >= new Date(contract.created_at),
  );
  TestValidator.predicate(
    "snapshot snapshotted_at is valid date",
    !isNaN(new Date(snapshot.snapshotted_at).getTime()),
  );
}
