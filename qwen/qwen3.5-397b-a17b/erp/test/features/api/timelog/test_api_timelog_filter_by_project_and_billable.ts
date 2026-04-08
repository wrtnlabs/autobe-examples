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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test filtering timelogs by project ID and billable status.
 *
 * Validates the complete timelog filtering workflow including member authentication, organization setup, project creation, task assignment, and comprehensive filter testing. Ensures that filtering by project ID, billable status, and task ID returns correct results with proper intersection logic.
 *
 * Special attention is given to verifying that: (1) project filtering returns only timelogs for the specified project; (2) billable filtering correctly separates billable and non-billable entries; (3) combined filters return the correct intersection; (4) task filtering within a project works correctly; (5) filtering by a task that doesn't belong to the specified project returns empty results without validation errors.
 *
 * 1. Member registers and authenticates.
 * 2. Organization is created for employee context.
 * 3. Two projects are created for filter testing (Project A and Project B).
 * 4. Tasks are created within each project for task-level filtering.
 * 5. Employee is assigned to both projects as project member.
 * 6. Multiple timelogs are created with varying characteristics:
 *    - Project A, billable, with task
 *    - Project A, non-billable, without task
 *    - Project B, billable, with task
 *    - Project B, non-billable, without task
 * 7. Filter tests are executed:
 *    7.1. Filter by Project A ID - verify only Project A timelogs returned.
 *    7.2. Filter by billable=true - verify only billable timelogs returned.
 *    7.3. Filter by billable=false - verify only non-billable timelogs returned.
 *    7.4. Filter by Project A + billable=true - verify intersection.
 *    7.5. Filter by task ID within Project A - verify task-specific timelogs.
 *    7.6. Filter by task ID from Project B with Project A filter - verify empty result.
 */
export async function test_api_timelog_filter_by_project_and_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create two projects for filter testing
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - Filter Test",
        color: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - Filter Test",
        color: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 4. Create tasks within each project
  const taskA1 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: "Task A1 - Development",
          priority: "high",
        },
      },
    );
  typia.assert(taskA1);
  const taskA2 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: "Task A2 - Testing",
          priority: "medium",
        },
      },
    );
  typia.assert(taskA2);
  const taskB1 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: "Task B1 - Design",
          priority: "low",
        },
      },
    );
  typia.assert(taskB1);
  // 5. Get employee info from member context and assign to projects
  // Note: Employee should be auto-created during organization join
  // We need to get the employee ID from the context - for now, we'll use the member ID
  // In real scenario, employee would be created separately
  // For this test, we'll create timelogs directly as the authenticated member's employee context
  // Create timelogs with different characteristics
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const pastDateStr = pastDate.toISOString();
  // Timelog 1: Project A, billable, with task
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: pastDateStr,
        duration_minutes: 60,
        hrm_platform_project_id: projectA.id,
        hrm_platform_task_id: taskA1.id,
        billable: true,
        description: "Development work on Project A",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: Project A, non-billable, without task
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: pastDateStr,
        duration_minutes: 30,
        hrm_platform_project_id: projectA.id,
        hrm_platform_task_id: null,
        billable: false,
        description: "Internal meeting for Project A",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: Project B, billable, with task
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: pastDateStr,
        duration_minutes: 90,
        hrm_platform_project_id: projectB.id,
        hrm_platform_task_id: taskB1.id,
        billable: true,
        description: "Design work on Project B",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Project B, non-billable, without task
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: pastDateStr,
        duration_minutes: 45,
        hrm_platform_project_id: projectB.id,
        hrm_platform_task_id: null,
        billable: false,
        description: "Administrative work for Project B",
      },
    },
  );
  typia.assert(timelog4);
  // 7. Filter Tests
  // 7.1. Filter by Project A ID - should return timelog1 and timelog2
  const projectAFilter = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        hrmPlatformProjectId: projectA.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(projectAFilter);
  TestValidator.equals("Project A filter count", projectAFilter.data.length, 2);
  TestValidator.predicate(
    "All Project A timelogs have correct project",
    projectAFilter.data.every((t) => t.project.id === projectA.id),
  );
  // 7.2. Filter by billable=true - should return timelog1 and timelog3
  const billableFilter = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(billableFilter);
  TestValidator.equals("Billable filter count", billableFilter.data.length, 2);
  TestValidator.predicate(
    "All billable timelogs are billable",
    billableFilter.data.every((t) => t.billable === true),
  );
  // 7.3. Filter by billable=false - should return timelog2 and timelog4
  const nonBillableFilter =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(nonBillableFilter);
  TestValidator.equals(
    "Non-billable filter count",
    nonBillableFilter.data.length,
    2,
  );
  TestValidator.predicate(
    "All non-billable timelogs are non-billable",
    nonBillableFilter.data.every((t) => t.billable === false),
  );
  // 7.4. Filter by Project A + billable=true - should return only timelog1
  const projectABillableFilter =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        hrmPlatformProjectId: projectA.id,
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(projectABillableFilter);
  TestValidator.equals(
    "Project A + billable filter count",
    projectABillableFilter.data.length,
    1,
  );
  TestValidator.equals(
    "Project A billable timelog has correct project",
    projectABillableFilter.data[0].project.id,
    projectA.id,
  );
  TestValidator.predicate(
    "Project A billable timelog is billable",
    projectABillableFilter.data[0].billable === true,
  );
  // 7.5. Filter by task ID within Project A - should return timelog1
  const taskAFilter = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        hrmPlatformProjectId: projectA.id,
        hrmPlatformTaskId: taskA1.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(taskAFilter);
  TestValidator.equals("Task A1 filter count", taskAFilter.data.length, 1);
  TestValidator.predicate(
    "Task A1 timelog has correct task",
    taskAFilter.data[0].task !== null &&
      taskAFilter.data[0].task!.id === taskA1.id,
  );
  // 7.6. Filter by task ID from Project B with Project A filter - should return empty
  const mismatchedTaskFilter =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        hrmPlatformProjectId: projectA.id,
        hrmPlatformTaskId: taskB1.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(mismatchedTaskFilter);
  TestValidator.equals(
    "Mismatched task filter count",
    mismatchedTaskFilter.data.length,
    0,
  );
}
