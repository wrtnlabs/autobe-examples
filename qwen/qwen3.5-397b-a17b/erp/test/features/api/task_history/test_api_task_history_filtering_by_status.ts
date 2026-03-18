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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_history_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection and organization
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Assign employee to project as project-lead (to enable task management)
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create initial task (starts with status 'open' by default)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 7. Execute status changes to generate history records
  // Change 1: open → in-progress
  const taskInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" },
      },
    );
  typia.assert(taskInProgress);
  // Change 2: in-progress → completed
  const taskCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" },
      },
    );
  typia.assert(taskCompleted);
  // Change 3: completed → closed
  const taskClosed =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "closed" },
      },
    );
  typia.assert(taskClosed);
  // 8. Test filtering by new_status='completed'
  const completedHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "completed",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(completedHistories);
  TestValidator.predicate(
    "completed filter returns only completed transitions",
    completedHistories.data.every((h) => h.new_status === "completed"),
  );
  TestValidator.predicate(
    "completed filter pagination reflects filtered count",
    completedHistories.pagination.records === completedHistories.data.length,
  );
  // 9. Test filtering by old_status='in-progress'
  const fromInProgressHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "in-progress",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(fromInProgressHistories);
  TestValidator.predicate(
    "old_status filter returns only transitions from in-progress",
    fromInProgressHistories.data.every((h) => h.old_status === "in-progress"),
  );
  // 10. Test combined filtering (old_status='in-progress' AND new_status='completed')
  const combinedHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "in-progress",
          new_status: "completed",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedHistories);
  TestValidator.predicate(
    "combined filter returns matching transitions only",
    combinedHistories.data.every(
      (h) => h.old_status === "in-progress" && h.new_status === "completed",
    ),
  );
  TestValidator.predicate(
    "combined filter returns fewer results than single filter",
    combinedHistories.pagination.records <=
      fromInProgressHistories.pagination.records,
  );
  // 11. Test filtering by user_id
  const userHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          user_id: memberAuth.id,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(userHistories);
  TestValidator.predicate(
    "user_id filter returns only user's actions",
    userHistories.data.every((h) => h.user.id === memberAuth.id),
  );
  // 12. Test empty result handling (filter with no matches)
  const emptyHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "open",
          new_status: "closed", // This transition never happened directly
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyHistories);
  TestValidator.equals(
    "empty filter returns zero records",
    emptyHistories.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination shows zero",
    emptyHistories.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter pages is zero",
    emptyHistories.pagination.pages,
    0,
  );
  // 13. Verify sort order is descending by created_at
  const allHistories =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(allHistories);
  TestValidator.predicate(
    "histories sorted descending by created_at",
    allHistories.data.every((h, idx, arr) => {
      if (idx === 0) return true;
      return (
        new Date(arr[idx - 1].created_at).getTime() >=
        new Date(h.created_at).getTime()
      );
    }),
  );
  // 14. Verify total history count matches expected (initial creation + 3 status changes = 4 records)
  TestValidator.equals(
    "total history records count",
    allHistories.pagination.records,
    4,
  );
}