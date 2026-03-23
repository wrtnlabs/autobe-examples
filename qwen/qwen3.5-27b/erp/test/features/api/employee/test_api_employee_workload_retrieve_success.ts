import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test successful retrieval of employee workload statistics.
 *
 * This test validates the primary success path for retrieving comprehensive
 * workload statistics for an employee, including hours worked across different
 * time periods, active timer status, task assignments, and project breakdowns.
 */
export async function test_api_employee_workload_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create an employee invitation to establish employee record
  const invitation: IHrmPlatformEmployeeInvitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // 3. Extract employee ID from the invitation
  // Note: If the invitation was not redeemed (new user), redeemedByMember will be null
  // In this case, we cannot test workload retrieval without an existing employee
  if (invitation.redeemedByMember === null) {
    // If no employee exists from this invitation, we cannot proceed with workload test
    // This is expected behavior for new user invitations
    TestValidator.predicate(
      "invitation must be redeemed to have employee workload data",
      false,
    );
    return;
  }
  // 4. Retrieve workload statistics with the employee ID
  const workload: IHrmPlatformEmployee.IWorkload =
    await api.functional.hrmPlatform.admin.employees.workload(adminConnection, {
      employeeId: invitation.redeemedByMember.id,
    });
  typia.assert(workload);
  // 5. Validate all expected fields exist and have correct types
  // typia.assert() already validates complete type structure including:
  // - All numeric fields (hoursThisWeek, hoursThisMonth, hoursAllTime, etc.)
  // - All boolean fields (activeTimer)
  // - All nullable fields (activeTimerProjectId, activeTimerTaskId, activeTimerStartedAt)
  // - Array field (hoursByProject)
  // 6. Validate numeric fields are properly calculated (should be 0 for new employee with no activity)
  TestValidator.equals("hoursThisWeek should be 0", workload.hoursThisWeek, 0);
  TestValidator.equals(
    "hoursThisMonth should be 0",
    workload.hoursThisMonth,
    0,
  );
  TestValidator.equals("hoursAllTime should be 0", workload.hoursAllTime, 0);
  TestValidator.equals(
    "assignedTasksCount should be 0",
    workload.assignedTasksCount,
    0,
  );
  TestValidator.equals(
    "pendingTimesheetsCount should be 0",
    workload.pendingTimesheetsCount,
    0,
  );
  TestValidator.equals("billableHours should be 0", workload.billableHours, 0);
  TestValidator.equals(
    "nonBillableHours should be 0",
    workload.nonBillableHours,
    0,
  );
  // 7. Confirm hoursByProject is an empty array when no timelogs exist
  TestValidator.equals(
    "hoursByProject should be empty array",
    workload.hoursByProject.length,
    0,
  );
  // 8. Verify activeTimer fields are null when no timer is running
  TestValidator.predicate(
    "activeTimer should be false",
    workload.activeTimer === false,
  );
  TestValidator.equals(
    "activeTimerProjectId should be null",
    workload.activeTimerProjectId,
    null,
  );
  TestValidator.equals(
    "activeTimerTaskId should be null",
    workload.activeTimerTaskId,
    null,
  );
  TestValidator.equals(
    "activeTimerStartedAt should be null",
    workload.activeTimerStartedAt,
    null,
  );
}
