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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet rejection workflow by manager.
 *
 * Validates the complete timesheet rejection flow including employee timesheet creation, submission, and manager rejection with reason. Ensures that the rejection correctly updates the timesheet status, sets review metadata, and allows the employee to resubmit after corrections.
 *
 * 1. Employee registers and creates a draft timesheet for a specific week.
 * 2. Employee submits the timesheet for approval (status changes to 'submitted').
 * 3. Manager with time:approve permission rejects the timesheet with a rejection reason.
 * 4. Validates rejection succeeds with status 'rejected', reviewed_at and reviewer_id set, and rejection_reason populated.
 * 5. Verifies timesheet returns to modifiable state allowing employee corrections and resubmission.
 */
export async function test_api_timesheet_rejection_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee registration and authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 2. Create draft timesheet for employee
  // Generate a valid Monday date for week_start_date
  const monday = new Date();
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  const weekStartDate = monday
    .toISOString()
    .split("T")[0] satisfies string as string & tags.Format<"date">;
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status", timesheet.status, "draft");
  // 3. Employee submits timesheet (draft → submitted)
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at set",
    submittedTimesheet.submittedAt !== null &&
      submittedTimesheet.submittedAt !== undefined,
  );
  TestValidator.predicate(
    "rejection reason cleared on submit",
    submittedTimesheet.rejectionReason === null ||
      submittedTimesheet.rejectionReason === undefined,
  );
  // 4. Manager registration and authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 5. Manager rejects timesheet with reason (submitted → rejected)
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      managerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(rejectedTimesheet);
  // 6. Validate rejection results
  TestValidator.equals("rejected status", rejectedTimesheet.status, "rejected");
  TestValidator.equals(
    "rejection reason",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at set",
    rejectedTimesheet.reviewedAt !== null &&
      rejectedTimesheet.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewer_id set",
    rejectedTimesheet.reviewer !== null &&
      rejectedTimesheet.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer is manager",
    rejectedTimesheet.reviewer!.id,
    manager.id,
  );
  // 7. Employee can modify and resubmit rejected timesheet (rejected → draft → submitted)
  const resubmittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "draft",
          rejection_reason: null,
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(resubmittedTimesheet);
  TestValidator.equals("back to draft", resubmittedTimesheet.status, "draft");
  // 8. Employee resubmits after corrections
  const finalTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(finalTimesheet);
  TestValidator.equals(
    "resubmitted status",
    finalTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "rejection reason cleared",
    finalTimesheet.rejectionReason === null ||
      finalTimesheet.rejectionReason === undefined,
  );
}
