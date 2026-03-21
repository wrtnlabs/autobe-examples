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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_submission_duplicate_week_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create organization (member automatically becomes employee with owner role)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create project for timelog associations
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Calculate Monday of target week (timesheets use Monday-Sunday week periods)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // Create timelog for the target week
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate,
        duration: 120,
      },
    },
  );
  typia.assert(timelog);
  // Create first timesheet (Timesheet A) for the target week
  const timesheetA = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheetA);
  // Phase 1: Submit Timesheet A successfully
  const submittedTimesheetA =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheetA.id,
    });
  typia.assert(submittedTimesheetA);
  // Verify submission succeeded
  TestValidator.equals(
    "Timesheet A status after submission",
    submittedTimesheetA.status,
    "submitted",
  );
  TestValidator.predicate(
    "Timesheet A has submitted_at timestamp",
    submittedTimesheetA.submitted_at !== null,
  );
  // Phase 2: Attempt to create second timesheet for the same week
  // Expected to fail with 409 Conflict due to unique constraint (one timesheet per employee per week)
  await TestValidator.error(
    "Cannot create duplicate timesheet for same week",
    async () => {
      await generate_random_erp_hrm_member_timesheets_create(memberConnection, {
        body: {
          week_start_date: weekStartDate,
        },
      });
    },
  );
}
