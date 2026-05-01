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
 * Test task creation with server-side default values when only the title is provided.
 *
 * Validates that creating a task within an active project using only the required
 * title field automatically applies server-side defaults: status defaults to 'open'
 * and priority defaults to 'medium'. Confirms that all optional fields remain null
 * when omitted from the request body.
 *
 * Special attention is given to verifying that a TaskHistory entry is automatically
 * recorded upon creation with the new_status set to 'open', and that all generated
 * identifiers and timestamps are properly populated.
 *
 * 1. Member authenticates via join to obtain project management credentials.
 * 2. Member creates an active project to serve as the task container.
 * 3. Member creates a task providing only the title field — all optional
 *    fields are intentionally omitted to trigger server-side defaults.
 * 4. Validates the task status defaults to 'open'.
 * 5. Validates the task priority defaults to 'medium'.
 * 6. Confirms description, estimated_hours, due_date, assignedEmployee,
 *    parentTask, and deleted_at are all null when not provided.
 * 7. Verifies generated fields — id, created_at, updated_at — are populated.
 * 8. Confirms a TaskHistory entry exists with new_status set to 'open'.
 * 9. Verifies the task's project reference matches the created project and
 *    childTasks starts as an empty array.
 */
export async function test_api_task_creation_basic_with_defaults(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project to house the task
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with only the title — testing server-side defaults
  const task = await api.functional.erpHrm.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Validate server-side defaults for status and priority
  TestValidator.equals("status defaults to open", task.status, "open");
  TestValidator.equals("priority defaults to medium", task.priority, "medium");
  // 5. Validate optional fields remain null when omitted
  TestValidator.equals("description is null", task.description, null);
  TestValidator.equals("estimated_hours is null", task.estimated_hours, null);
  TestValidator.equals("due_date is null", task.due_date, null);
  TestValidator.equals("assignedEmployee is null", task.assignedEmployee, null);
  TestValidator.equals("parentTask is null", task.parentTask, null);
  TestValidator.equals("deleted_at is null", task.deleted_at, null);
  // 6. Validate generated fields exist
  TestValidator.predicate("id is populated", task.id.length > 0);
  TestValidator.predicate(
    "created_at is populated",
    task.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    task.updated_at.length > 0,
  );
  // 7. Validate task history records the creation event
  TestValidator.predicate(
    "has at least one status history entry",
    task.statusHistories.length >= 1,
  );
  const firstHistory = typia.assert(task.statusHistories[0]!);
  TestValidator.equals(
    "history new_status is open",
    firstHistory.new_status,
    "open",
  );
  // 8. Validate project reference and child tasks
  TestValidator.equals(
    "project reference matches",
    task.project.id,
    project.id,
  );
  TestValidator.equals("childTasks is empty", task.childTasks.length, 0);
}
