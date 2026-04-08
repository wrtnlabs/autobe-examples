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

// Extended type to include id for project response
interface IErpHrmProjectWithId extends IErpHrmProject {
  id: string;
}

export async function test_api_timesheet_retrieval_by_admin_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    },
  );
  typia.assert(organization);
  // 3. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 4. Create project (admin context includes organization)
  const project = typia.assert<IErpHrmProjectWithId>(
    await generate_random_erp_hrm_admin_projects_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#4A90E2",
          status: "active",
        },
      },
    ),
  );
  // 5. Create timelog for member
  const today = new Date();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        ).toISOString(),
        durationMinutes: 120,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Create timesheet for member (weekStartDate must be Monday)
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: new Date(
          monday.getFullYear(),
          monday.getMonth(),
          monday.getDate(),
        ).toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 7. Admin retrieves the timesheet with member's ID and timesheet ID
  const retrievedTimesheet =
    await api.functional.erpHrm.admin.members.timesheets.at(adminConnection, {
      memberId: member.id,
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 8. Validate response structure
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "status is submitted",
    retrievedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "has week dates",
    retrievedTimesheet.weekStartDate !== null &&
      retrievedTimesheet.weekEndDate !== null,
  );
  TestValidator.predicate("has total hours", retrievedTimesheet.totalHours > 0);
  TestValidator.predicate(
    "has submitted timestamp",
    retrievedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "reviewer is null",
    retrievedTimesheet.reviewerEmployee,
    null,
  );
  TestValidator.predicate(
    "has timelogs array",
    retrievedTimesheet.timesheetTimelogs.length > 0,
  );
  TestValidator.predicate(
    "has employee info",
    retrievedTimesheet.employee !== null,
  );
}