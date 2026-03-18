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

export async function test_api_task_history_retrieval_with_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
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
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as project-lead (needed for task management)
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create task with initial status "open"
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 7. Update task status multiple times to generate history records
  // First change: open → in-progress
  const taskInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskInProgress);
  // Second change: in-progress → completed
  const taskCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskCompleted);
  // Third change: completed → closed
  const taskClosed =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "closed",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskClosed);
  // 8. Retrieve task status change history
  const historyResponse =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 9. Validate history response
  TestValidator.equals("history entry count", historyResponse.data.length, 4);
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    historyResponse.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination total pages",
    historyResponse.pagination.pages,
    1,
  );
  // Validate entries are sorted by created_at descending (most recent first)
  const historyEntries = historyResponse.data;
  TestValidator.equals(
    "first entry new_status (most recent)",
    historyEntries[0].new_status,
    "closed",
  );
  TestValidator.equals(
    "second entry new_status",
    historyEntries[1].new_status,
    "completed",
  );
  TestValidator.equals(
    "third entry new_status",
    historyEntries[2].new_status,
    "in-progress",
  );
  TestValidator.equals(
    "fourth entry new_status (oldest)",
    historyEntries[3].new_status,
    "open",
  );
  // Validate old_status values
  TestValidator.predicate(
    "first entry old_status is not null",
    historyEntries[0].old_status !== null,
  );
  TestValidator.equals(
    "first entry old_status",
    historyEntries[0].old_status,
    "completed",
  );
  TestValidator.equals(
    "second entry old_status",
    historyEntries[1].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "third entry old_status",
    historyEntries[2].old_status,
    "open",
  );
  TestValidator.predicate(
    "fourth entry old_status is null (initial creation)",
    historyEntries[3].old_status === null,
  );
  // Validate user field contains member information
  for (let i = 0; i < historyEntries.length; i++) {
    TestValidator.equals(
      "entry user id matches member",
      historyEntries[i].user.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "entry user email matches",
      historyEntries[i].user.email,
      memberAuth.email,
    );
    TestValidator.equals(
      "entry user display_name matches",
      historyEntries[i].user.display_name,
      memberAuth.displayName,
    );
  }
  // Validate timestamps are in ISO 8601 format
  for (let i = 0; i < historyEntries.length; i++) {
    TestValidator.predicate(
      "entry created_at is valid ISO 8601",
      !isNaN(Date.parse(historyEntries[i].created_at)),
    );
  }
  // Validate chronological order (descending)
  for (let i = 0; i < historyEntries.length - 1; i++) {
    TestValidator.predicate(
      "entries sorted by created_at descending",
      new Date(historyEntries[i].created_at).getTime() >=
        new Date(historyEntries[i + 1].created_at).getTime(),
    );
  }
}
