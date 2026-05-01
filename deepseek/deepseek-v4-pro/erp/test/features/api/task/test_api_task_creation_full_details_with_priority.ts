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

export async function test_api_task_creation_full_details_with_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join/authenticate as a member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project for the task
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Prepare task creation data with all optional fields explicitly set
  const description = RandomGenerator.paragraph({ sentences: 4 });
  const estimatedHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // 4. Create the task — use generation function with body overrides for controlled values
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        description,
        priority: "high",
        estimated_hours: estimatedHours,
        due_date: dueDate,
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Validate response preserves all explicitly set values
  TestValidator.equals(
    "description matches input",
    task.description,
    description,
  );
  TestValidator.equals("priority is high", task.priority, "high");
  TestValidator.equals(
    "estimated hours matches input",
    task.estimated_hours,
    estimatedHours,
  );
  TestValidator.equals("due date matches input", task.due_date, dueDate);
  // 6. Status should default to 'open' when not explicitly provided
  TestValidator.equals("status defaults to open", task.status, "open");
  // 7. Verify TaskHistory creation entry
  TestValidator.predicate(
    "at least one status history entry exists",
    task.statusHistories.length >= 1,
  );
  const creationHistory = task.statusHistories[0];
  TestValidator.equals(
    "old_status is null for creation entry",
    creationHistory.old_status as string | null,
    null,
  );
  TestValidator.equals(
    "new_status is open matching default",
    creationHistory.new_status,
    "open",
  );
}
