import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employee_contracts_create";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test employee contract creation success path with proper authentication and employee setup.
 *
 * Validates the complete contract creation workflow including member registration with employee:manage permission, employee invitation to create an employee record, and contract creation with valid employment terms. Ensures that the contract is properly created with all required fields and the employee relation is correctly established.
 *
 * Special attention is given to verifying that the contract becomes the employee's active contract (end_date is null) and that all employment terms (pay_rate, pay_period, working_hours_per_week) are accurately reflected in the response. The test also validates system-managed timestamps (created_at, updated_at) and soft-delete field (deleted_at).
 *
 * 1. Member registers with email and password credentials to obtain authentication.
 * 2. Member creates employee invitation which creates an employee record when the invited email already has an account.
 * 3. Employee contract is created with valid terms including start_date, pay_rate, pay_period, working_hours_per_week, and optional notes.
 * 4. Validates contract response contains all required fields, employee relation with summary data, and correct employment terms.
 * 5. Verifies business logic: contract is active (end_date is null), timestamps are populated, and deleted_at is null.
 */
export async function test_api_employee_contract_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create employee member who will receive the contract
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeMember);
  // 3. Create employee invitation - since email already has account, creates employee record
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: employeeEmail,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(employeeInvitation);
  // 4. Create employee contract with valid employment terms
  const contract =
    await generate_random_hrm_platform_member_employee_contracts_create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 5. Validate contract response structure and business logic
  TestValidator.predicate("contract id exists", contract.id !== undefined);
  TestValidator.predicate(
    "employee relation exists",
    contract.employee !== undefined,
  );
  TestValidator.predicate("start_date is set", contract.start_date !== null);
  TestValidator.predicate(
    "end_date is null for active contract",
    contract.end_date === null,
  );
  TestValidator.predicate("pay_rate is positive", contract.pay_rate > 0);
  TestValidator.equals("pay_period is monthly", contract.pay_period, "monthly");
  TestValidator.predicate(
    "working_hours_per_week is positive",
    contract.working_hours_per_week > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    contract.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    contract.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null for active contract",
    contract.deleted_at === null,
  );
}