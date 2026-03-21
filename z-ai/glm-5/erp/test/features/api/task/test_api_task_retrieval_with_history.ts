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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_task_retrieval_with_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Add member as project member with role='member'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 4. Retrieve a task - using random IDs for simulation/testing
  const task = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(task);
  // 5. Validate business logic (typia.assert already validated types)
  // Validate status is one of the allowed values
  TestValidator.predicate(
    "status is valid",
    ["open", "in-progress", "completed", "closed"].includes(task.status),
  );
  // Validate priority is one of the allowed values
  TestValidator.predicate(
    "priority is valid",
    ["low", "medium", "high", "urgent"].includes(task.priority),
  );
  // Validate project summary is present
  TestValidator.predicate("project summary exists", task.project !== null);
  // Validate histories array exists
  TestValidator.predicate(
    "histories array exists",
    Array.isArray(task.histories),
  );
  // Validate subtasks array exists
  TestValidator.predicate(
    "subtasks array exists",
    Array.isArray(task.subtasks),
  );
  // Validate deletedAt is null for active task
  TestValidator.equals(
    "deletedAt is null for active task",
    task.deletedAt,
    null,
  );
  // Validate history entries have correct structure when present
  if (task.histories.length > 0) {
    const history = task.histories[0];
    TestValidator.predicate(
      "history previousStatus is valid",
      ["open", "in-progress", "completed", "closed"].includes(
        history.previousStatus,
      ),
    );
    TestValidator.predicate(
      "history newStatus is valid",
      ["open", "in-progress", "completed", "closed"].includes(
        history.newStatus,
      ),
    );
  }
}
