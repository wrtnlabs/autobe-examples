import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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

export async function test_api_timesheet_timelog_submission_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the business rule that timelogs can be added to timesheets in 'draft' status.
   * This validates that the addTimelogs endpoint works correctly for draft timesheets.
   * Note: Full submission restriction testing requires submit/reject APIs not currently available.
   */
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project for timelog entries
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
      },
    },
  );
  typia.assert(project);
  // 3. Calculate week dates (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  // 4. Create initial timelog entry within the week
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: monday.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // 5. Create a draft timesheet for that week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet status is 'draft'
  TestValidator.equals(
    "initial timesheet status should be draft",
    timesheet.status,
    "draft",
  );
  // Store initial total hours
  const initialTotalHours = timesheet.total_hours;
  // 6. Create additional timelog in the same week
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: wednesday.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // 7. Add timelog to the draft timesheet - should succeed
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [timelog2.id],
        },
      },
    );
  typia.assert(updatedTimesheet);
  // 8. Verify the timesheet is still in draft status
  TestValidator.equals(
    "timesheet status remains draft after adding timelog",
    updatedTimesheet.status,
    "draft",
  );
  // 9. Verify the added timelog appears in the timesheet's timelogs array
  const timelogIds = updatedTimesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog2 should be added to timesheet",
    timelogIds.includes(timelog2.id),
  );
  // 10. Verify total_hours was recalculated
  const expectedTotalHours = initialTotalHours + timelog2.duration / 60;
  TestValidator.predicate(
    "total_hours should reflect added timelog",
    Math.abs(updatedTimesheet.total_hours - expectedTotalHours) < 0.01,
  );
  // 11. Create another timelog and add to the draft timesheet
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: thursday.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  const updatedTimesheet2 =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [timelog3.id],
        },
      },
    );
  typia.assert(updatedTimesheet2);
  // 12. Verify the third timelog was also added successfully
  const timelogIds2 = updatedTimesheet2.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog3 should be added to timesheet",
    timelogIds2.includes(timelog3.id),
  );
  TestValidator.equals(
    "timesheet status remains draft after multiple additions",
    updatedTimesheet2.status,
    "draft",
  );
}
