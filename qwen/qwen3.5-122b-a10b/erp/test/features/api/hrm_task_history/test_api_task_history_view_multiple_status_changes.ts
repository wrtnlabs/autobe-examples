import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

export async function test_api_task_history_view_multiple_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (UUID generated - assumes organization exists in test environment)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create project within organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 4. Create employee record (UUID generated - assumes employee exists in test environment)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 5. Assign member to project as project-lead
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
      params: {
        projectId: project.id,
      },
    });
  typia.assert(projectMember);
  // 6. Create task within project (initial status: open)
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          priority: "medium",
          status: "open",
        } satisfies IHrmTask.ICreate,
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 7. Change task status from open to in-progress
  const inProgressTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(inProgressTask);
  // 8. Change task status from in-progress to completed
  const completedTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(completedTask);
  // 9. Change task status from completed to closed
  const closedTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "closed",
        } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(closedTask);
  // 10. View task history audit trail
  const history =
    await api.functional.hrm.member.organizations.projects.tasks.history.at(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(history);
  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    history.pagination.records > 0,
  );
  TestValidator.predicate("pagination has pages", history.pagination.pages > 0);
  // 12. Validate history entries count (should be 3 status changes)
  TestValidator.equals("history entry count", history.data.length, 3);
  // 13. Validate history entries are in chronological order (most recent first)
  // Entry 0: completed → closed
  // Entry 1: in-progress → completed
  // Entry 2: open → in-progress
  TestValidator.equals(
    "first entry new status",
    history.data[0].new_status,
    "closed",
  );
  TestValidator.equals(
    "first entry old status",
    history.data[0].old_status,
    "completed",
  );
  TestValidator.equals(
    "second entry new status",
    history.data[1].new_status,
    "completed",
  );
  TestValidator.equals(
    "second entry old status",
    history.data[1].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "third entry new status",
    history.data[2].new_status,
    "in-progress",
  );
  TestValidator.equals(
    "third entry old status",
    history.data[2].old_status,
    "open",
  );
  // 14. Validate each entry has member information
  TestValidator.predicate(
    "first entry has member",
    history.data[0].member !== null,
  );
  TestValidator.predicate(
    "second entry has member",
    history.data[1].member !== null,
  );
  TestValidator.predicate(
    "third entry has member",
    history.data[2].member !== null,
  );
  // 15. Validate timestamps are in descending order (most recent first)
  const timestamps = history.data.map((h) => h.timestamp);
  for (let i = 0; i < timestamps.length - 1; i++) {
    TestValidator.predicate(
      `timestamp ${i} >= timestamp ${i + 1}`,
      new Date(timestamps[i]).getTime() >=
        new Date(timestamps[i + 1]).getTime(),
    );
  }
}
