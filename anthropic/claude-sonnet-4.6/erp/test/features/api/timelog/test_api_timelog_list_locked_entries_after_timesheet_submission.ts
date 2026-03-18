import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timelog_list_locked_entries_after_timesheet_submission(
  connection: api.IConnection,
): Promise<void> {
  // ──────────────────────────────────────────────
  // 1. Register a new member and obtain JWT connection
  // ──────────────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // memberConnection.headers is now set by authorize_member_join internally
  // ──────────────────────────────────────────────
  // 2. Create an organization
  // ──────────────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // ──────────────────────────────────────────────
  // 3. Get the organization member identity (the owner is already created)
  //    organization.owner is IErpHrmOrganizationMember.ISummary with id = orgMemberId
  // ──────────────────────────────────────────────
  const orgMemberId = organization.owner.id;
  // ──────────────────────────────────────────────
  // 4. Create an active project
  // ──────────────────────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // ──────────────────────────────────────────────
  // 5. Assign the member to the project
  // ──────────────────────────────────────────────
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMemberId,
          projectRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // ──────────────────────────────────────────────
  // 6. Define two distinct ISO weeks
  // Week A: 2025-01-06 (Mon) → 2025-01-12 (Sun)
  // Week B: 2025-01-13 (Mon) → 2025-01-19 (Sun)
  // ──────────────────────────────────────────────
  const weekAStart = "2025-01-06T00:00:00.000Z";
  const weekAEnd = "2025-01-12T23:59:59.999Z";
  const weekBStart = "2025-01-13T00:00:00.000Z";
  const weekBEnd = "2025-01-19T23:59:59.999Z";
  // Timesheet boundaries (Monday / Sunday midnight UTC)
  const timesheetWeekAStart = "2025-01-06T00:00:00.000Z";
  const timesheetWeekAEnd = "2025-01-12T00:00:00.000Z";
  // ──────────────────────────────────────────────
  // 7. Create 3 timelogs for Week A
  // ──────────────────────────────────────────────
  const timelogA1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: "2025-01-06T00:00:00.000Z",
        duration_minutes: 60,
      },
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: "2025-01-07T00:00:00.000Z",
        duration_minutes: 90,
      },
    },
  );
  typia.assert(timelogA2);
  const timelogA3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: "2025-01-08T00:00:00.000Z",
        duration_minutes: 120,
      },
    },
  );
  typia.assert(timelogA3);
  // ──────────────────────────────────────────────
  // 8. Create 1 timelog for Week B (will NOT be in the timesheet)
  // ──────────────────────────────────────────────
  const timelogB1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: "2025-01-13T00:00:00.000Z",
        duration_minutes: 45,
      },
    },
  );
  typia.assert(timelogB1);
  // ──────────────────────────────────────────────
  // 9. Create a draft timesheet covering Week A
  // ──────────────────────────────────────────────
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: timesheetWeekAStart,
        weekEndDate: timesheetWeekAEnd,
      },
    },
  );
  typia.assert(timesheet);
  // ──────────────────────────────────────────────
  // 10. Submit the timesheet
  // ──────────────────────────────────────────────
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // ──────────────────────────────────────────────
  // 11. List all timelogs (no filters) → expect 4 total
  // ──────────────────────────────────────────────
  const allTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    { body: {} satisfies IErpHrmTimelog.IRequest },
  );
  typia.assert(allTimelogs);
  TestValidator.equals(
    "total timelog count is 4",
    allTimelogs.pagination.records,
    4,
  );
  TestValidator.equals("data array length is 4", allTimelogs.data.length, 4);
  // ──────────────────────────────────────────────
  // 12. Verify locked status for Week A timelogs (timesheetId = timesheet.id)
  //     and unlocked status for Week B timelogs (timesheetId = null)
  // ──────────────────────────────────────────────
  const weekAIds = new Set([timelogA1.id, timelogA2.id, timelogA3.id]);
  const weekBIds = new Set([timelogB1.id]);
  for (const tl of allTimelogs.data) {
    if (weekAIds.has(tl.id)) {
      TestValidator.predicate(
        `timelog ${tl.id} (week A) has non-null timesheetId`,
        tl.timesheetId !== null,
      );
      TestValidator.equals(
        `timelog ${tl.id} (week A) timesheetId matches submitted timesheet`,
        tl.timesheetId,
        timesheet.id,
      );
    } else if (weekBIds.has(tl.id)) {
      TestValidator.equals(
        `timelog ${tl.id} (week B) timesheetId is null`,
        tl.timesheetId,
        null,
      );
    }
  }
  // ──────────────────────────────────────────────
  // 13. Filter by Week A date range → 3 locked timelogs
  // ──────────────────────────────────────────────
  const weekAFiltered = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        startDate: weekAStart,
        endDate: weekAEnd,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(weekAFiltered);
  TestValidator.equals(
    "week A filter returns 3 records",
    weekAFiltered.pagination.records,
    3,
  );
  TestValidator.equals(
    "week A filter data length is 3",
    weekAFiltered.data.length,
    3,
  );
  for (const tl of weekAFiltered.data) {
    TestValidator.predicate(
      `week A filtered timelog ${tl.id} has non-null timesheetId`,
      tl.timesheetId !== null,
    );
    TestValidator.equals(
      `week A filtered timelog ${tl.id} timesheetId matches submitted timesheet`,
      tl.timesheetId,
      timesheet.id,
    );
  }
  // ──────────────────────────────────────────────
  // 14. Filter by Week B date range → 1 unlocked timelog
  // ──────────────────────────────────────────────
  const weekBFiltered = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        startDate: weekBStart,
        endDate: weekBEnd,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(weekBFiltered);
  TestValidator.equals(
    "week B filter returns 1 record",
    weekBFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "week B filter data length is 1",
    weekBFiltered.data.length,
    1,
  );
  const weekBTimelog = weekBFiltered.data[0];
  TestValidator.equals(
    "week B timelog timesheetId is null",
    weekBTimelog!.timesheetId,
    null,
  );
  // ──────────────────────────────────────────────
  // 15. Confirm locked timelogs are still visible after submission
  // ──────────────────────────────────────────────
  TestValidator.predicate(
    "locked timelogs (week A) are visible in unfiltered list",
    allTimelogs.data.filter((tl) => weekAIds.has(tl.id)).length === 3,
  );
}
