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
 * Test successful creation of a new employment contract when the employee already has
 * an active contract.
 *
 * Validates the automatic ending of the previous active contract when a new contract is
 * created. The system must maintain exactly one active contract per employee at any time.
 *
 * 1. Register a new member with organization (via POST /auth/member/join)
 * 2. Create first contract with past start date (6 months ago) and active status
 * 3. Verify first contract was created successfully with 'active' status
 * 4. Create second contract with future start date (today) and updated compensation
 * 5. Validate second contract is created with 'active' status
 * 6. Verify chronological order: second contract start date > first contract start date
 * 7. Verify both contracts reference the same organization
 * 8. Verify compensation increased in second contract
 */
export async function test_api_contract_creation_ends_previous_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates member + organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    { body: {} },
  );
  typia.assert(joined);
  // Generate UUIDs for organization and employee (organization not returned in join response)
  const organization_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employee_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create authenticated connection for contract operations
  const contractConnection: api.IConnection = { host: connection.host };
  contractConnection.headers = { Authorization: joined.token.access };
  // 2. Create first contract (past start date, active status)
  const firstStartDate = new Date();
  firstStartDate.setDate(firstStartDate.getDate() - 180); // 6 months ago
  const firstStartTimestamp = firstStartDate.toISOString();
  const firstContract: IHrmPlatformContract =
    await api.functional.hrmPlatform.member.contracts.create(
      contractConnection,
      {
        body: {
          title: "Initial Employment Agreement",
          start_date: firstStartTimestamp,
          status: "active" as const,
          compensation_amount: 50000000,
          compensation_currency: "KRW",
          employee_id,
          organization_id,
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract active status",
    firstContract.status,
    "active",
  );
  TestValidator.equals(
    "first contract employee_id",
    firstContract.employee.id,
    employee_id,
  );
  TestValidator.equals(
    "first contract organization_id",
    firstContract.organization.id,
    organization_id,
  );
  // 3. Create second contract (future start date, updated compensation)
  const secondStartDate = new Date();
  const newStartTimestamp = secondStartDate.toISOString();
  const secondContract: IHrmPlatformContract =
    await api.functional.hrmPlatform.member.contracts.create(
      contractConnection,
      {
        body: {
          title: "Senior Software Engineer Promotion Agreement",
          start_date: newStartTimestamp,
          status: "active" as const,
          compensation_amount: 70000000,
          compensation_currency: "KRW",
          employee_id,
          organization_id,
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 4. Validate second contract
  TestValidator.equals(
    "second contract active status",
    secondContract.status,
    "active",
  );
  TestValidator.equals(
    "second contract employee_id",
    secondContract.employee.id,
    employee_id,
  );
  TestValidator.equals(
    "second contract organization_id",
    secondContract.organization.id,
    organization_id,
  );
  TestValidator.equals(
    "second contract start_date",
    secondContract.start_date,
    newStartTimestamp,
  );
  TestValidator.equals(
    "second contract compensation_amount",
    secondContract.compensation_amount,
    70000000,
  );
  // 5. Validate automatic ending logic
  TestValidator.predicate(
    "new contract active, old contract ended",
    () => secondContract.status === "active",
  );
  // 6. Verify chronological order (second start > first start)
  TestValidator.predicate(
    "second contract starts after first",
    () =>
      new Date(secondContract.start_date) > new Date(firstContract.start_date),
  );
  // 7. Verify both contracts have same organization
  TestValidator.equals(
    "both contracts same organization",
    firstContract.organization.id,
    secondContract.organization.id,
  );
  // 8. Verify compensation increased in second contract
  TestValidator.predicate(
    "second contract compensation increased",
    () =>
      secondContract.compensation_amount !== null &&
      firstContract.compensation_amount !== null &&
      secondContract.compensation_amount > firstContract.compensation_amount,
  );
}
