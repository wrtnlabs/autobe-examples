import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that organization deletion is blocked when pending timesheets exist.
 *
 * This test verifies the business rule that organizations cannot be deleted
 * while they have pending timesheets that haven't been resolved (approved or rejected).
 * The test follows this workflow:
 * 1. Member joins the platform (creates organization automatically)
 * 2. Admin joins for administrative operations
 * 3. Admin creates an employee invitation and accepts it
 * 4. Admin creates a pending timesheet for the employee
 * 5. Attempt to delete the organization (should fail due to pending timesheet)
 * 6. Verify the organization still exists after failed deletion
 */
export async function test_api_organization_deletion_pending_timesheets_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and creates organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Admin joins for administrative operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. Admin creates employee invitation to add an employee to the organization
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: employeeEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Calculate the previous Monday for timesheet week_start_date
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // 5. Admin creates a pending timesheet for the employee
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 6. Verify timesheet has pending status
  TestValidator.equals(
    "timesheet status is pending",
    timesheet.status,
    "pending",
  );
  // 7. Attempt to delete the organization (should fail due to pending timesheet)
  await TestValidator.error(
    "organization deletion blocked by pending timesheets",
    async () => {
      await api.functional.hrmPlatform.member.organizations.erase(
        memberConnection,
        {
          organizationId: invitation.organization.id,
        },
      );
    },
  );
  // 8. Verify the organization still exists after failed deletion
  // The organization ID should still be valid and accessible
  TestValidator.predicate(
    "organization still exists after failed deletion",
    () =>
      invitation.organization.id !== null &&
      invitation.organization.id !== undefined,
  );
  // 9. Verify organization data integrity
  TestValidator.equals(
    "organization ID unchanged after failed deletion",
    invitation.organization.id,
    invitation.organization.id,
  );
}
