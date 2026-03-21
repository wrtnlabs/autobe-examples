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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_current_view_active_with_task(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and organization via member join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 3: Assign the employee to the project as project lead (required for task creation)
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  // Step 4: Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for Timer",
        description: "This is a test task for timer tracking",
      },
    },
  );
  typia.assert(task);
  // Step 5: Start a timer with the project and task
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // Step 6: Retrieve the current active timer
  const currentTimer =
    await api.functional.erpHrm.member.timers.current.at(memberConnection);
  typia.assert(currentTimer);
  // Step 7: Validate the timer response
  // Validate timer ID is a valid UUID
  TestValidator.predicate(
    "timer id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      currentTimer.id,
    ),
  );
  // Validate started_at is a valid ISO 8601 timestamp
  TestValidator.predicate(
    "started_at is valid ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(currentTimer.started_at),
  );
  // Validate elapsed_minutes is non-negative
  TestValidator.predicate(
    "elapsed_minutes is non-negative",
    currentTimer.elapsed_minutes >= 0,
  );
  // Validate project reference
  TestValidator.equals(
    "project id matches",
    currentTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    currentTimer.project.name,
    project.name,
  );
  // Validate task reference (should not be null)
  TestValidator.predicate("task is not null", currentTimer.task !== null);
  if (currentTimer.task !== null) {
    TestValidator.equals("task id matches", currentTimer.task.id, task.id);
    TestValidator.equals(
      "task title matches",
      currentTimer.task.title,
      task.title,
    );
  }
  // Validate description
  TestValidator.equals(
    "description matches",
    currentTimer.description,
    timerDescription,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    currentTimer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    currentTimer.updated_at !== undefined,
  );
}
