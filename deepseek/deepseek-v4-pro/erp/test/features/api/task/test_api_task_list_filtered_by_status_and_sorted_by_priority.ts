import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Verify task listing with status filtering and priority-based sorting within a project.
 *
 * Validates that the task list endpoint correctly applies status filters and sorting criteria. Creates a project with three tasks of varying statuses and priorities, then queries for only open-status tasks sorted by priority in ascending order. Confirms that the response contains exactly the matching task with accurate pagination metadata.
 *
 * 1. Member authenticates via join to obtain an authorized session.
 * 2. Member creates a new project to serve as the task container.
 * 3. Three tasks are created within the project: open/high, in-progress/medium, completed/low.
 * 4. The task list endpoint is called with status=['open'] and sort by priority ascending.
 * 5. Validates pagination shows current=1, records=1, pages=1 for the single matching result.
 * 6. Confirms the returned task matches the open task by id, status, and priority.
 */
export async function test_api_task_list_filtered_by_status_and_sorted_by_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create three tasks with different statuses and priorities
  const taskOpen = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        status: "open",
        priority: "high",
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(taskOpen);
  const taskInProgress =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          status: "in-progress",
          priority: "medium",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(taskInProgress);
  const taskCompleted =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          status: "completed",
          priority: "low",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(taskCompleted);
  // 4. List tasks filtered by status=['open'] and sorted by priority ascending
  const result = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: ["open"],
        sort: "priority",
        order: "asc",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    1,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 1);
  // 6. Validate only the open task is returned with correct attributes
  TestValidator.equals("only one task returned", result.data.length, 1);
  TestValidator.equals(
    "task id matches open task",
    result.data[0].id,
    taskOpen.id,
  );
  TestValidator.equals("task status is open", result.data[0].status, "open");
  TestValidator.equals(
    "task priority is high",
    result.data[0].priority,
    "high",
  );
}
