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

export async function test_api_timer_project_change_with_membership(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and authenticates - establishes employee context in organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create first active project (Project A) for initial timer association
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectA);
  // Step 3: Assign the authenticated employee as a project member to Project A
  // When member joins an organization, an employee record is created for them
  // The employee context is established through authentication
  const projectMemberA =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: { employee_id: member.id, role: "member" },
      },
    );
  typia.assert(projectMemberA);
  // Step 4: Create second active project (Project B) for the project change operation
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectB);
  // Step 5: Assign the authenticated employee as a project member to Project B
  // This is required for the project change validation to succeed
  const projectMemberB =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: { employee_id: member.id, role: "member" },
      },
    );
  typia.assert(projectMemberB);
  // Step 6: Create a timer associated with Project A
  // This timer will be updated to switch to Project B
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: { project_id: projectA.id },
    },
  );
  typia.assert(timer);
  // Verify timer is initially associated with Project A
  TestValidator.equals(
    "timer initially associated with Project A",
    timer.project.id,
    projectA.id,
  );
  // Step 7: Update the timer to change the project from Project A to Project B
  // This validates that project membership is checked when changing timer project
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: { erp_hrm_project_id: projectB.id },
    },
  );
  typia.assert(updatedTimer);
  // Step 8: Verify the update response shows the new project association
  TestValidator.equals(
    "timer project changed to Project B",
    updatedTimer.project.id,
    projectB.id,
  );
  // Verify timer remains active (elapsed_minutes should be non-negative)
  TestValidator.predicate(
    "timer has non-negative elapsed time",
    updatedTimer.elapsed_minutes >= 0,
  );
  // Verify the timer ID remains the same (continuity during project reassignment)
  TestValidator.equals(
    "timer ID unchanged after project change",
    updatedTimer.id,
    timer.id,
  );
}
