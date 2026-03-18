import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog filtering by date range and task association.
 *
 * Workflow:
 * 1. Create member account and authenticate
 * 2. Create employee record for the member
 * 3. Create project and assign employee as project member
 * 4. Create tasks within the project
 * 5. Create timelog entries with various dates and task associations
 * 6. Test date range filtering (dateFrom, dateTo)
 * 7. Test task filtering (taskId)
 * 8. Verify sorting order (date DESC, created_at DESC)
 * 9. Test pagination with limit parameter
 * 10. Test edge case: empty date range returns empty data array
 */
export async function test_api_timelog_list_date_range_and_task_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create new connection for actor-specific auth
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create employee record - utility handles role_id internally
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create project for timelog and task testing
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign employee to project as project member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Create two tasks within the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "high",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task2);
  // 6. Create 6 timelog entries spanning multiple weeks
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  // Timelogs with task assignments
  const timelogWithTask1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: task1.id,
          date: new Date(now.getTime() - 2 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogWithTask1);
  const timelogWithTask2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: task2.id,
          date: new Date(now.getTime() - 5 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogWithTask2);
  const timelogWithTask1Again =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: task1.id,
          date: new Date(now.getTime() - 8 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogWithTask1Again);
  // Timelogs without task assignments (null task_id)
  const timelogNoTask1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: null,
          date: new Date(now.getTime() - 3 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogNoTask1);
  const timelogNoTask2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: null,
          date: new Date(now.getTime() - 6 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogNoTask2);
  const timelogNoTask3 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          task_id: null,
          date: new Date(now.getTime() - 10 * oneDay).toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogNoTask3);
  // 7. Test date range filtering - get all timelogs within range
  const dateFrom = new Date(now.getTime() - 11 * oneDay).toISOString();
  const dateTo = new Date(now.getTime() - 1 * oneDay).toISOString();
  const dateRangeResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        dateFrom,
        dateTo,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range returns all timelogs",
    dateRangeResult.data.length,
    6,
  );
  TestValidator.predicate(
    "pagination records match",
    dateRangeResult.pagination.records === 6,
  );
  // 8. Test edge case: date range with no timelogs
  const emptyDateFrom = new Date(now.getTime() + 1 * oneDay).toISOString();
  const emptyDateTo = new Date(now.getTime() + 5 * oneDay).toISOString();
  const emptyDateRangeResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        dateFrom: emptyDateFrom,
        dateTo: emptyDateTo,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(emptyDateRangeResult);
  TestValidator.equals(
    "empty date range returns empty array",
    emptyDateRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty range pagination records",
    emptyDateRangeResult.pagination.records,
    0,
  );
  // 9. Test task filtering - get only timelogs with task1
  const task1FilterResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        taskId: task1.id,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(task1FilterResult);
  TestValidator.equals(
    "task1 filter returns 2 timelogs",
    task1FilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all task1 results have task",
    task1FilterResult.data.every((t) => t.task != null),
  );
  // 10. Verify timelogs without tasks have null task relation
  const noTaskFilterResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        taskId: null,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(noTaskFilterResult);
  TestValidator.equals(
    "null taskId filter returns 3 timelogs",
    noTaskFilterResult.data.length,
    3,
  );
  TestValidator.predicate(
    "no-task results have null task",
    noTaskFilterResult.data.every((t) => t.task == null),
  );
  // 11. Verify sorting order (date DESC, then created_at DESC)
  const sortedResult = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "dates sorted descending",
    sortedResult.data.every((t, i) => {
      if (i === 0) return true;
      return (
        new Date(t.date).getTime() <=
        new Date(sortedResult.data[i - 1].date).getTime()
      );
    }),
  );
  // 12. Test pagination with limit=2
  const paginatedResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        limit: 2,
        page: 1,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedResult.pagination.records,
    6,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    paginatedResult.pagination.pages === Math.ceil(6 / 2),
  );
  TestValidator.equals(
    "first page data length",
    paginatedResult.data.length,
    2,
  );
  // Get second page
  const secondPageResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        limit: 2,
        page: 2,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page current",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length",
    secondPageResult.data.length,
    2,
  );
}