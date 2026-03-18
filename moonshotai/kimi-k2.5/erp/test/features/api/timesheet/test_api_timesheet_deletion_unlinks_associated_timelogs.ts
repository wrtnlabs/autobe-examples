import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_deletion_unlinks_associated_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Create a project (required for timelog creation)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        colorCode: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        budgetHours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create a timelog for the project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date().toISOString(),
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // Verify timelog is initially unlinked (no timesheet)
  TestValidator.equals(
    "initial timelog has no timesheet association",
    timelog.timesheet,
    null,
  );
  // 4. Create a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        weekEndDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Update the timesheet to associate the timelog
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        timelogsToAdd: [timelog.id],
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // Verify timelog is now associated with the timesheet
  TestValidator.equals(
    "timesheet has the associated timelog",
    updatedTimesheet.timelogs.length,
    1,
  );
  TestValidator.equals(
    "associated timelog has correct id",
    updatedTimesheet.timelogs[0]?.id,
    timelog.id,
  );
  // 6. Delete the timesheet
  await api.functional.erpHrm.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 7. Retrieve the previously associated timelog
  const unlinkedTimelog = await api.functional.erpHrm.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(unlinkedTimelog);
  // 8. Verify the timelog's timesheet reference is now null
  TestValidator.equals(
    "timelog timesheet reference is null after timesheet deletion",
    unlinkedTimelog.timesheet,
    null,
  );
  // Verify timelog data is preserved
  TestValidator.equals(
    "timelog id is preserved",
    unlinkedTimelog.id,
    timelog.id,
  );
  TestValidator.equals(
    "timelog project is preserved",
    unlinkedTimelog.project.id,
    project.id,
  );
}
