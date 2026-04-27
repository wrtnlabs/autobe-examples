import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

/**
 * Test timelog list endpoint with filters, pagination, and sorting.
 *
 * This comprehensive test validates all filtering capabilities (date range,
 * project ID, billable status, task ID), pagination, and sorting on the
 * timelog list (PATCH) endpoint. The test creates 7 timelogs with varied
 * attributes across 2 projects and 2 tasks, then verifies each filter
 * independently, combined AND logic, pagination continuity, sorting order,
 * and full-text search.
 *
 * 1. Register member, capture credentials, create organization
 * 2. Re-authenticate to get fresh employee records
 * 3. Create Project Alpha and Project Beta
 * 4. Add the employee to both projects as member
 * 5. Create 2 tasks in Project Alpha
 * 6. Create 7 timelogs with varied dates, durations, projects, billable
 *    flags, task assignments, and descriptions
 * 7. Test A: Date range filter (date_from / date_to)
 * 8. Test B: Project filter (projectId)
 * 9. Test C: Billable filter (billable = true / false)
 * 10. Test D: Task filter (taskId)
 * 11. Test E: Combined filters (AND logic)
 * 12. Test F: Pagination (page / limit)
 * 13. Test G: Sorting (duration asc/desc, default date desc)
 * 14. Test H: Search filter (description text match)
 */
export async function test_api_timelog_list_filters_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Register a member and capture credentials for re-login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization (auto-creates employee record for owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get fresh IAuthorized with populated employees
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const refreshedAuthorized =
    await api.functional.hrmTimeTracking.auth.member.login(memberConnection, {
      body: loginBody,
    });
  typia.assert(refreshedAuthorized);
  // Extract employee ID from fresh authorization
  const employeeId: string = refreshedAuthorized.employees[0]!.id;
  // 4. Create Project Alpha
  const projectAlpha =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectAlpha);
  // 5. Create Project Beta
  const projectBeta =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project Beta - ${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(projectBeta);
  // 6. Add employee to Project Alpha as member
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        role: "member",
      },
      params: {
        projectId: projectAlpha.id,
      },
    },
  );
  // 7. Add employee to Project Beta as member
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        role: "member",
      },
      params: {
        projectId: projectBeta.id,
      },
    },
  );
  // 8. Create 2 tasks in Project Alpha
  const task1 =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: projectAlpha.id,
        },
      },
    );
  typia.assert(task1);
  const task2 =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: `Task Two - ${RandomGenerator.alphabets(6)}`,
        },
        params: {
          projectId: projectAlpha.id,
        },
      },
    );
  typia.assert(task2);
  // 9. Calculate dates relative to current time
  const now: Date = new Date();
  const dayOfWeek: number = now.getDay();
  // This week Monday
  const thisMonday: Date = new Date(now);
  thisMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);
  // Last week Monday
  const lastMonday: Date = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  // This week Wednesday
  const thisWednesday: Date = new Date(thisMonday);
  thisWednesday.setDate(thisMonday.getDate() + 2);
  // This week Friday
  const thisFriday: Date = new Date(thisMonday);
  thisFriday.setDate(thisMonday.getDate() + 4);
  const D1: string = lastMonday.toISOString();
  const D2: string = thisMonday.toISOString();
  const D3: string = thisWednesday.toISOString();
  const D4: string = thisFriday.toISOString();
  // 10. Create 7 timelogs with varied attributes
  const durations: number[] = [45, 60, 90, 120, 30, 150, 75];
  const descriptions: string[] = [
    "Design API endpoints for filtering",
    "Implement database schema migrations",
    "Review pull request for timelog module",
    "Write unit tests for project service",
    "Bug fix: pagination off-by-one error",
    "Deploy staging environment for QA testing",
    "Sprint planning and task estimation meeting",
  ];
  const timelogs: IHrmTimeTrackingTimelog[] = [];
  // D1 (last Mon) x Project Alpha x billable=true x task1
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D1,
          duration_minutes: durations[0],
          project_id: projectAlpha.id,
          task_id: task1.id,
          billable: true,
          description: descriptions[0],
        },
      },
    ),
  );
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D1,
          duration_minutes: durations[1],
          project_id: projectAlpha.id,
          task_id: task1.id,
          billable: true,
          description: descriptions[1],
        },
      },
    ),
  );
  // D2 (this Mon) x Project Alpha x billable=false x task2
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D2,
          duration_minutes: durations[2],
          project_id: projectAlpha.id,
          task_id: task2.id,
          billable: false,
          description: descriptions[2],
        },
      },
    ),
  );
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D2,
          duration_minutes: durations[3],
          project_id: projectAlpha.id,
          task_id: task2.id,
          billable: false,
          description: descriptions[3],
        },
      },
    ),
  );
  // D3 (this Wed) x Project Beta x billable=true x no task
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D3,
          duration_minutes: durations[4],
          project_id: projectBeta.id,
          billable: true,
          description: descriptions[4],
        },
      },
    ),
  );
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D3,
          duration_minutes: durations[5],
          project_id: projectBeta.id,
          billable: true,
          description: descriptions[5],
        },
      },
    ),
  );
  // D4 (this Fri) x Project Beta x billable=true x no task
  timelogs.push(
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: D4,
          duration_minutes: durations[6],
          project_id: projectBeta.id,
          billable: true,
          description: descriptions[6],
        },
      },
    ),
  );
  for (const tl of timelogs) typia.assert(tl);
  TestValidator.equals("created 7 timelogs", timelogs.length, 7);
  // ---- Test A: Date range filter ----
  // date_from=D2, date_to=D3 -> expects 4 timelogs (D2 and D3 only)
  {
    const result = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          date_from: D2,
          date_to: D3,
        },
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "date range returns 4 timelogs",
      result.data.length,
      4,
    );
    const d2Prefix = D2.substring(0, 10);
    const d3Prefix = D3.substring(0, 10);
    for (const t of result.data) {
      const datePrefix = t.date.substring(0, 10);
      TestValidator.predicate(
        "timelog is on D2 or D3",
        () => datePrefix === d2Prefix || datePrefix === d3Prefix,
      );
    }
  }
  // ---- Test B: Project filter ----
  // projectId=Project Alpha -> expects 4 timelogs
  {
    const result = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          projectId: projectAlpha.id,
        },
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "project filter returns 4 timelogs",
      result.data.length,
      4,
    );
    for (const t of result.data) {
      TestValidator.equals(
        "timelog belongs to Project Alpha",
        t.project.id,
        projectAlpha.id,
      );
    }
  }
  // ---- Test C: Billable filter ----
  // billable=true -> expects 5 timelogs (D1x2 + D3x2 + D4x1)
  {
    const billableTrue =
      await api.functional.hrmTimeTracking.member.timelogs.index(
        memberConnection,
        {
          body: {
            billable: true,
          },
        },
      );
    typia.assert(billableTrue);
    TestValidator.equals(
      "billable=true returns 5 timelogs",
      billableTrue.data.length,
      5,
    );
    for (const t of billableTrue.data) {
      TestValidator.equals("timelog is billable", t.billable, true);
    }
  }
  // billable=false -> expects 2 timelogs (D2x2)
  {
    const billableFalse =
      await api.functional.hrmTimeTracking.member.timelogs.index(
        memberConnection,
        {
          body: {
            billable: false,
          },
        },
      );
    typia.assert(billableFalse);
    TestValidator.equals(
      "billable=false returns 2 timelogs",
      billableFalse.data.length,
      2,
    );
    for (const t of billableFalse.data) {
      TestValidator.equals("timelog is non-billable", t.billable, false);
    }
  }
  // ---- Test D: Task filter ----
  // taskId=task1 -> expects 2 timelogs
  {
    const result = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          taskId: task1.id,
        },
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "task filter returns 2 timelogs",
      result.data.length,
      2,
    );
    for (const t of result.data) {
      TestValidator.equals("timelog belongs to task1", t.task!.id, task1.id);
    }
  }
  // ---- Test E: Combined filters (AND logic) ----
  // date_from=D2, projectId=Project Alpha, billable=false -> expects 2 timelogs
  {
    const result = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          date_from: D2,
          projectId: projectAlpha.id,
          billable: false,
        },
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "combined filters return 2 timelogs",
      result.data.length,
      2,
    );
    for (const t of result.data) {
      TestValidator.equals(
        "timelog belongs to Project Alpha",
        t.project.id,
        projectAlpha.id,
      );
      TestValidator.equals("timelog is non-billable", t.billable, false);
    }
  }
  // ---- Test F: Pagination ----
  // Page 1 with limit=2 -> 2 items
  {
    const page1 = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
    typia.assert(page1);
    TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
    TestValidator.equals("pagination.current = 1", page1.pagination.current, 1);
    TestValidator.equals("pagination.limit = 2", page1.pagination.limit, 2);
    TestValidator.equals("pagination.records = 7", page1.pagination.records, 7);
  }
  // Page 2 with limit=2 -> 2 different items
  {
    const page2 = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 has 2 items", page2.data.length, 2);
    TestValidator.equals("pagination.current = 2", page2.pagination.current, 2);
  }
  // Page 4 with limit=2 -> 1 item (last partial page)
  {
    const page4 = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 4,
        },
      },
    );
    typia.assert(page4);
    TestValidator.equals("page 4 has 1 item", page4.data.length, 1);
    TestValidator.equals("pagination.current = 4", page4.pagination.current, 4);
    TestValidator.equals("pagination.records = 7", page4.pagination.records, 7);
    TestValidator.equals("pagination.pages = 4", page4.pagination.pages, 4);
  }
  // ---- Test G: Sorting ----
  // Sort by duration_minutes ascending
  {
    const asc = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          sort: "duration_minutes",
          direction: "asc",
        },
      },
    );
    typia.assert(asc);
    for (let i = 1; i < asc.data.length; i++) {
      TestValidator.predicate(
        `duration asc [${i - 1}] <= [${i}]`,
        () =>
          asc.data[i - 1]!.duration_minutes <= asc.data[i]!.duration_minutes,
      );
    }
  }
  // Sort by duration_minutes descending
  {
    const desc = await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          sort: "duration_minutes",
          direction: "desc",
        },
      },
    );
    typia.assert(desc);
    for (let i = 1; i < desc.data.length; i++) {
      TestValidator.predicate(
        `duration desc [${i - 1}] >= [${i}]`,
        () =>
          desc.data[i - 1]!.duration_minutes >= desc.data[i]!.duration_minutes,
      );
    }
  }
  // Default sort (no sort params) -> date descending
  {
    const defaultSort =
      await api.functional.hrmTimeTracking.member.timelogs.index(
        memberConnection,
        {
          body: {},
        },
      );
    typia.assert(defaultSort);
    for (let i = 1; i < defaultSort.data.length; i++) {
      TestValidator.predicate(
        `date desc [${i - 1}] >= [${i}]`,
        () =>
          new Date(defaultSort.data[i - 1]!.date).getTime() >=
          new Date(defaultSort.data[i]!.date).getTime(),
      );
    }
  }
  // ---- Test H: Search filter ----
  // Search by a unique description
  {
    const searchResult =
      await api.functional.hrmTimeTracking.member.timelogs.index(
        memberConnection,
        {
          body: {
            search: descriptions[0],
          },
        },
      );
    typia.assert(searchResult);
    TestValidator.equals(
      "search returns 1 timelog",
      searchResult.data.length,
      1,
    );
    TestValidator.equals(
      "timelog description matches",
      searchResult.data[0]!.description,
      descriptions[0],
    );
  }
}
