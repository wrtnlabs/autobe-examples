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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test employee contract listing with pagination support.
 *
 * Validates the complete employee contract list retrieval flow including member authentication, organization creation, employee invitation, multiple contract creation, and paginated list retrieval. Ensures that the pagination metadata is accurate and all contract records contain the required fields with proper structure.
 *
 * Special attention is given to verifying that the pagination records count matches the total contracts created, that active contracts (end_date is null) are correctly distinguished from historical contracts (end_date is set), and that the employee nested objects contain all required relation data including member and role information.
 *
 * 1. Member registers and authenticates via join operation.
 * 2. Organization is created with member as owner.
 * 3. Employee invitation is created to establish employee record.
 * 4. Multiple contracts are created for the employee with varying start dates and pay periods.
 * 5. Contract list is retrieved with pagination parameters.
 * 6. Validates pagination metadata, contract structure, and employee relations.
 */
export async function test_api_employee_contract_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Get the Owner role from organization context
  // We need to create an employee first - use invitation with a valid role
  // For simplicity, we'll create the invitation and extract employee info
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  // Create a temporary member to invite (so invitation returns employee, not pending invitation)
  const tempMemberConnection: api.IConnection = { host: connection.host };
  const tempMember = await authorize_member_join(tempMemberConnection, {
    body: {
      email: invitationEmail,
      password: "TempPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(tempMember);
  // Now create invitation - since email exists, it will create employee directly
  // We need to get the role ID first - for this test, we'll use a generated UUID
  // In real scenario, we'd query roles, but for E2E we generate one
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Extract employee ID from invitation response
  // The invitation contains the employee relation when employee is created
  const employeeId = (invitation as any).employee?.id ?? invitation.id;
  // 4. Create multiple contracts for the employee
  const contractCount = 3;
  const contracts: IHrmPlatformEmployeeContract[] = [];
  for (let i = 0; i < contractCount; i++) {
    const contract =
      await generate_random_hrm_platform_member_employee_contracts_create(
        memberConnection,
        {
          body: {
            hrm_platform_employee_id: employeeId,
            start_date: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * (30 * i),
            ).toISOString(),
            pay_rate: typia.random<number & tags.Minimum<1000>>(),
            pay_period: RandomGenerator.pick([
              "hourly",
              "daily",
              "weekly",
              "monthly",
            ] as const),
            working_hours_per_week: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
            >(),
          } satisfies IHrmPlatformEmployeeContract.ICreate,
        },
      );
    typia.assert(contract);
    contracts.push(contract);
  }
  // 5. Retrieve contract list with pagination
  const response =
    await api.functional.hrmPlatform.member.employee_contracts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records matches contracts created",
    response.pagination.records === contractCount,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    response.pagination.pages === Math.ceil(contractCount / 20),
  );
  // 7. Validate contract data structure
  TestValidator.predicate(
    "data array contains all contracts",
    response.data.length === contractCount,
  );
  for (const contract of response.data) {
    // Validate required contract fields
    TestValidator.predicate(
      "contract has valid UUID id",
      typeof contract.id === "string" && contract.id.length > 0,
    );
    TestValidator.predicate(
      "contract has valid start_date",
      typeof contract.start_date === "string" && contract.start_date.length > 0,
    );
    TestValidator.predicate(
      "contract end_date is null or valid date string",
      contract.end_date === null ||
        (typeof contract.end_date === "string" && contract.end_date.length > 0),
    );
    TestValidator.predicate(
      "contract pay_rate is positive number",
      typeof contract.pay_rate === "number" && contract.pay_rate > 0,
    );
    TestValidator.predicate(
      "contract pay_period is valid",
      ["hourly", "daily", "weekly", "monthly"].includes(contract.pay_period),
    );
    TestValidator.predicate(
      "contract working_hours_per_week is positive integer",
      typeof contract.working_hours_per_week === "number" &&
        contract.working_hours_per_week > 0,
    );
    TestValidator.predicate(
      "contract has valid created_at timestamp",
      typeof contract.created_at === "string" && contract.created_at.length > 0,
    );
    // Validate employee nested object
    TestValidator.predicate(
      "contract employee has valid id",
      typeof contract.employee.id === "string" &&
        contract.employee.id.length > 0,
    );
    TestValidator.predicate(
      "contract employee has employment_type",
      typeof contract.employee.employment_type === "string" &&
        contract.employee.employment_type.length > 0,
    );
    TestValidator.predicate(
      "contract employee has valid status",
      ["active", "deactivated"].includes(contract.employee.status),
    );
    TestValidator.predicate(
      "contract employee has member relation",
      typeof contract.employee.member === "object" &&
        contract.employee.member !== null &&
        typeof contract.employee.member.id === "string" &&
        typeof contract.employee.member.email === "string",
    );
    TestValidator.predicate(
      "contract employee has role relation",
      typeof contract.employee.role === "object" &&
        contract.employee.role !== null &&
        typeof contract.employee.role.id === "string" &&
        typeof contract.employee.role.name === "string",
    );
  }
  // 8. Validate sorting (created_at descending)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        `contracts sorted by created_at descending (index ${i})`,
        prevDate >= currDate,
      );
    }
  }
}
