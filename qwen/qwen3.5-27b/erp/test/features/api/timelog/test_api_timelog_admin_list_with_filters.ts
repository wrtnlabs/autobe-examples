import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
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
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test admin retrieving filtered and paginated timelog entries.
 *
 * This test validates the comprehensive filtering and pagination capabilities
 * of the timelog listing endpoint for administrators. It verifies date range
 * filtering, project filtering, task filtering, billable status filtering,
 * pagination controls, and sorting functionality.
 */
export async function test_api_timelog_admin_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member authentication for organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create employee invitations
  const invitation1 =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {},
    );
  typia.assert(invitation1);
  const invitation2 =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {},
    );
  typia.assert(invitation2);
  // 4. Create projects for timelog association
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: { status: "active" } },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: { status: "active" } },
  );
  typia.assert(project2);
  // 5. Create tasks within projects
  const task1 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      body: {},
      params: { projectId: project1.id },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      body: {},
      params: { projectId: project2.id },
    },
  );
  typia.assert(task2);
  // 6. Create multiple timelog entries with varying attributes
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  // Timelog 1: Project 1, with task, billable, yesterday
  const timelog1 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project1.id,
        task_id: task1.id,
        date: yesterday.toISOString(),
        duration: 480,
        billable: true,
        description: "Work on task 1",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: Project 1, without task, billable, yesterday
  const timelog2 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project1.id,
        task_id: null,
        date: yesterday.toISOString(),
        duration: 240,
        billable: true,
        description: "General project work",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: Project 2, with task, non-billable, today
  const timelog3 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project2.id,
        task_id: task2.id,
        date: now.toISOString(),
        duration: 360,
        billable: false,
        description: "Internal work",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Project 2, without task, billable, two days ago
  const timelog4 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project2.id,
        task_id: null,
        date: twoDaysAgo.toISOString(),
        duration: 180,
        billable: true,
        description: "Planning session",
      },
    },
  );
  typia.assert(timelog4);
  // 7. Test 1: List all timelogs with no filters
  const allTimelogs = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  TestValidator.equals(
    "total timelogs count",
    allTimelogs.pagination.records,
    4,
  );
  TestValidator.predicate(
    "has pagination data",
    allTimelogs.pagination.pages > 0,
  );
  // 8. Test 2: Filter by date range (yesterday only)
  const yesterdayTimelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        start_date: yesterday.toISOString(),
        end_date: yesterday.toISOString(),
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(yesterdayTimelogs);
  TestValidator.equals(
    "yesterday timelogs count",
    yesterdayTimelogs.pagination.records,
    2,
  );
  // 9. Test 3: Filter by project_id
  const project1Timelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        project_id: project1.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(project1Timelogs);
  TestValidator.equals(
    "project 1 timelogs count",
    project1Timelogs.pagination.records,
    2,
  );
  // 10. Test 4: Filter by task_id
  const task1Timelogs = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        task_id: task1.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(task1Timelogs);
  TestValidator.equals(
    "task 1 timelogs count",
    task1Timelogs.pagination.records,
    1,
  );
  // 11. Test 5: Filter by billable=true
  const billableTimelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  TestValidator.equals(
    "billable timelogs count",
    billableTimelogs.pagination.records,
    3,
  );
  // 12. Test 6: Combined filters (project 1 + date range + billable)
  const combinedFiltered =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        project_id: project1.id,
        start_date: yesterday.toISOString(),
        end_date: yesterday.toISOString(),
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter timelogs count",
    combinedFiltered.pagination.records,
    2,
  );
  // 13. Test 7: Pagination with custom limit
  const paginatedTimelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(paginatedTimelogs);
  TestValidator.equals(
    "pagination limit",
    paginatedTimelogs.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current",
    paginatedTimelogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedTimelogs.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "data array length matches limit",
    paginatedTimelogs.data.length <= 2,
  );
  // 14. Test 8: Sorting by date ascending
  const sortedAscending = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        sort: "date",
        order: "asc",
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(sortedAscending);
  TestValidator.predicate("sorted by date ascending", () => {
    if (sortedAscending.data.length < 2) return true;
    const firstDate = new Date(sortedAscending.data[0].date).getTime();
    const lastDate = new Date(
      sortedAscending.data[sortedAscending.data.length - 1].date,
    ).getTime();
    return firstDate <= lastDate;
  });
  // 15. Test 9: Sorting by date descending (default)
  const sortedDescending =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        sort: "date",
        order: "desc",
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(sortedDescending);
  TestValidator.predicate("sorted by date descending", () => {
    if (sortedDescending.data.length < 2) return true;
    const firstDate = new Date(sortedDescending.data[0].date).getTime();
    const lastDate = new Date(
      sortedDescending.data[sortedDescending.data.length - 1].date,
    ).getTime();
    return firstDate >= lastDate;
  });
  // 16. Verify timelog structure
  TestValidator.predicate(
    "timelog has required fields",
    () =>
      allTimelogs.data.length > 0 &&
      allTimelogs.data[0].id !== undefined &&
      allTimelogs.data[0].date !== undefined &&
      allTimelogs.data[0].duration !== undefined &&
      allTimelogs.data[0].billable !== undefined &&
      allTimelogs.data[0].employee !== undefined &&
      allTimelogs.data[0].project !== undefined,
  );
}
