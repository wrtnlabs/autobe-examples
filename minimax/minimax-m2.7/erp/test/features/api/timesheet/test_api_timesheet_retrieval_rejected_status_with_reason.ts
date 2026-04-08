import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_retrieval_rejected_status_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 4. Admin creates project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        description: "Test project for timesheet rejection",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Member creates timelog (use a Monday for the timesheet)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const projectEntry = project.items[0];
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectEntry.projectId,
        date: weekStart.toISOString(),
        durationMinutes: 480,
        description: "Test work on Monday",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Member creates timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Submit timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 7. Admin rejects timesheet with rejection reason
  const rejectionReason =
    "The hours logged for Project X are incomplete. Please add the remaining entries.";
  const rejectedTimesheet = await api.functional.erpHrm.admin.timesheets.reject(
    adminConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    },
  );
  typia.assert(rejectedTimesheet);
  // 8. Retrieve timesheet via GET endpoint
  const retrievedTimesheet =
    await api.functional.erpHrm.admin.members.timesheets.at(adminConnection, {
      memberId: member.id,
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 9. Validate business logic
  TestValidator.equals(
    "status is rejected",
    retrievedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt is set",
    retrievedTimesheet.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewerEmployee is set",
    retrievedTimesheet.reviewerEmployee !== null,
  );
  TestValidator.predicate(
    "timesheetTimelogs preserved",
    retrievedTimesheet.timesheetTimelogs.length > 0,
  );
}
