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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timelog_search_with_timesheet_status_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create organization member for the authenticated user
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember);
  // Create project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name()}`,
      },
    },
  );
  typia.assert(project);
  // Calculate week dates (Sunday-based)
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);
  // Create timelog for this week (will be associated with timesheet 1)
  const timelog1Start = new Date(thisWeekStart);
  timelog1Start.setHours(9, 0, 0, 0);
  const timelog1End = new Date(timelog1Start);
  timelog1End.setHours(10, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: timelog1Start.toISOString(),
        end_time: timelog1End.toISOString(),
        description: "Work session for this week",
      },
    },
  );
  typia.assert(timelog1);
  // Create timelog for next week (will be associated with timesheet 2)
  const timelog2Start = new Date(nextWeekStart);
  timelog2Start.setHours(9, 0, 0, 0);
  const timelog2End = new Date(timelog2Start);
  timelog2End.setHours(10, 0, 0, 0);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: timelog2Start.toISOString(),
        end_time: timelog2End.toISOString(),
        description: "Work session for next week",
      },
    },
  );
  typia.assert(timelog2);
  // Create timelog for 3 weeks later (no timesheet association)
  const futureDate = new Date(thisWeekStart);
  futureDate.setDate(thisWeekStart.getDate() + 21);
  const timelog3Start = new Date(futureDate);
  timelog3Start.setHours(9, 0, 0, 0);
  const timelog3End = new Date(timelog3Start);
  timelog3End.setHours(10, 0, 0, 0);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: timelog3Start.toISOString(),
        end_time: timelog3End.toISOString(),
        description: "Work session without timesheet",
      },
    },
  );
  typia.assert(timelog3);
  // Create timesheet for this week (draft status initially)
  const timesheet1 = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: thisWeekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet1);
  // Create timesheet for next week (draft status)
  const timesheet2 = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: nextWeekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet2);
  // Verify timesheet1 is in draft status initially
  TestValidator.equals(
    "timesheet1 initial status is draft",
    timesheet1.status,
    "draft",
  );
  // Submit the first timesheet (changes status to submitted)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet1.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted timesheet has status 'submitted'",
    submittedTimesheet.status,
    "submitted",
  );
  // Search timelogs to verify timesheetStatus field
  const searchResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "start_time",
        sortDirection: "asc",
      },
    },
  );
  typia.assert(searchResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has at least 3 records",
    searchResult.pagination.records >= 3,
  );
  // Find specific timelogs in results and verify timesheetStatus
  const resultTimelog1 = searchResult.data.find((t) => t.id === timelog1.id);
  const resultTimelog2 = searchResult.data.find((t) => t.id === timelog2.id);
  const resultTimelog3 = searchResult.data.find((t) => t.id === timelog3.id);
  // Timelog1 should have timesheetStatus as 'submitted' (associated with submitted timesheet)
  if (resultTimelog1) {
    TestValidator.equals(
      "timelog in submitted timesheet has status 'submitted'",
      resultTimelog1.timesheetStatus,
      "submitted",
    );
  }
  // Timelog2 should have timesheetStatus as 'draft' or null (associated with draft timesheet)
  if (resultTimelog2) {
    TestValidator.predicate(
      "timelog in draft timesheet has status 'draft' or null",
      resultTimelog2.timesheetStatus === "draft" ||
        resultTimelog2.timesheetStatus === null,
    );
  }
  // Timelog3 should have timesheetStatus as null (not associated with any timesheet)
  if (resultTimelog3) {
    TestValidator.equals(
      "timelog without timesheet has null status",
      resultTimelog3.timesheetStatus,
      null,
    );
  }
  // Test with pagination to ensure timesheet status is correctly populated across paginated results
  const paginatedResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated result has correct limit",
    paginatedResult.pagination.limit === 2,
  );
  TestValidator.predicate(
    "paginated result data length is at most limit",
    paginatedResult.data.length <= 2,
  );
  // Verify all returned items have valid timesheetStatus field (either null or valid string)
  for (const timelog of paginatedResult.data) {
    TestValidator.predicate(
      `timelog ${timelog.id} has valid timesheetStatus`,
      timelog.timesheetStatus === null ||
        typeof timelog.timesheetStatus === "string",
    );
  }
}
