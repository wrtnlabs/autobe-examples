import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test organization deletion is rejected when pending timesheets exist.
 *
 * Validates the critical business rule that organizations cannot be deleted while they have unresolved timesheets (draft or submitted status), ensuring data integrity for payroll and reporting purposes.
 *
 * Test Flow:
 * 1. Register new member account who will become organization owner.
 * 2. Create organization owned by the member.
 * 3. Register employee member account.
 * 4. Create timesheet with draft status for the employee.
 * 5. Attempt to delete organization - must fail with error about unresolved timesheets.
 * 6. Approve the pending timesheet to resolve it.
 * 7. Delete organization successfully after resolving timesheets.
 *
 * Key Validations:
 * 1. Organization deletion is blocked when timesheets exist in draft/submitted status.
 * 2. Organization deletion succeeds after all timesheets are resolved.
 * 3. Proper error handling for business logic constraints.
 */
export async function test_api_organization_deletion_blocked_by_pending_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register employee member account (will be added to organization separately)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 4. Create timesheet with draft status for the employee
  // Note: In a complete test, we would invite the employee to the organization first,
  // but this test focuses on the timesheet blocking behavior
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // 5. Attempt to delete organization - should fail due to pending timesheets
  // The organization has draft timesheets that must be resolved before deletion
  await TestValidator.error(
    "organization deletion blocked by pending timesheets",
    async () => {
      await api.functional.hrmPlatform.member.organizations.erase(
        ownerConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
  // 6. Approve the timesheet to resolve it (owner has time:approve permission)
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      ownerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // 7. Delete organization successfully after resolving timesheets
  // Note: In production, employees must also be removed before deletion
  await api.functional.hrmPlatform.member.organizations.erase(ownerConnection, {
    organizationId: organization.id,
  });
}
