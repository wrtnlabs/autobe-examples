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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_update_description_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates (establishes employee context in organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an active project in the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign the authenticated employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 4. Create a new timer with the project and an initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: initialDescription,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Store original values for comparison
  const originalStartedAt = timer.started_at;
  const originalProjectId = timer.project.id;
  const originalTask = timer.task;
  // 5. Update the timer with a new description
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 6. Verify the update response contains the new description
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    newDescription,
  );
  // 7. Verify the timer remains active (elapsed_minutes is present and non-negative)
  TestValidator.predicate("timer is active", updatedTimer.elapsed_minutes >= 0);
  // 8. Verify the start timestamp remains unchanged
  TestValidator.equals(
    "started_at unchanged",
    updatedTimer.started_at,
    originalStartedAt,
  );
  // 9. Verify the project association remains unchanged
  TestValidator.equals(
    "project unchanged",
    updatedTimer.project.id,
    originalProjectId,
  );
  // 10. Verify the task association remains unchanged
  TestValidator.equals(
    "task unchanged",
    updatedTimer.task?.id,
    originalTask?.id,
  );
  // 11. Verify updated_at timestamp exists (reflects modification time)
  TestValidator.predicate(
    "updated_at exists",
    updatedTimer.updated_at.length > 0,
  );
}
