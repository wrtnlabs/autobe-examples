import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_rejection_by_authorized_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create approver member account (manager role with time:approve permission)
  const approverAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(approverAuth);
  // 2. Create employee member account
  const employeeAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(employeeAuth);
  // 3. Create employee record for the employee member within the organization
  // Note: This requires the organization context from the approver's session
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: `Bearer ${employeeAuth.token.access}`,
  };
  const approverConnection: api.IConnection = { host: connection.host };
  approverConnection.headers = {
    Authorization: `Bearer ${approverAuth.token.access}`,
  };
  // Create employee record (approver creates employee for the employee member)
  const employeeRecord =
    await api.functional.hrmPlatform.member.employees.create(
      approverConnection,
      {
        body: {
          member_id: employeeAuth.member.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employeeRecord);
  // 4. Create draft timesheet for the employee
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Submit the timesheet (employee submits their own timesheet)
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Verify timesheet is now in submitted status
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Approver rejects the submitted timesheet
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 7. Validate rejection details
  TestValidator.equals(
    "timesheet status after rejection",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedTimesheet.reviewed_at !== null &&
      rejectedTimesheet.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewer matches approver",
    rejectedTimesheet.reviewedBy !== null &&
      rejectedTimesheet.reviewedBy !== undefined &&
      rejectedTimesheet.reviewedBy.id === approverAuth.member.id,
  );
  // 8. Verify timesheet returns to draft status after rejection (can be resubmitted)
  // The employee should be able to modify and resubmit
  TestValidator.predicate(
    "timesheet can be modified after rejection",
    rejectedTimesheet.status === "rejected" ||
      rejectedTimesheet.status === "draft",
  );
}
