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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_assignment_non_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (organization owner with project:manage permission)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Create a project under member A's organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create member B (will have their own org but we'll add them to A's org)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 4: Member A creates employee record for member B in their organization
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberB.email,
      },
    },
  );
  typia.assert(employeeB);
  // Step 5: Add employee B to the project as project_lead
  const projectMemberB =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeB.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMemberB);
  // Step 6: Create member C (will have their own org but we'll add them to A's org)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // Step 7: Member A creates employee record for member C in their organization
  // Employee C is NOT added to the project
  const employeeC = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberC.email,
      },
    },
  );
  typia.assert(employeeC);
  // Step 8: Attempt to create a task assigned to employee C (who is NOT a project member)
  // This should fail because employee C is not a project member
  await TestValidator.error(
    "task creation should fail when assigning to non-project-member employee",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.create(
        memberAConnection,
        {
          projectId: project.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            employee_id: employeeC.id,
          },
        },
      );
    },
  );
}
