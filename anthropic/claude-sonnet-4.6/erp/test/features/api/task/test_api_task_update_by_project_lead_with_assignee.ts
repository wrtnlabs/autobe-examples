import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_update_by_project_lead_with_assignee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member1 (org owner) and create their connection
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // member1Connection.headers is now updated with member1's token
  // Step 2: Create organization with member1 (member1 becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // The owner org member summary is on organization.owner
  const member1OrgMember = organization.owner;
  // Step 3: Create a custom role for member2 in the organization
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Register member2 and create their connection
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  // member2Connection.headers is now updated with member2's token
  // Step 5: Add member2 to the organization with the custom role
  const member2OrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      member1Connection,
      {
        body: {
          memberId: member2Auth.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(member2OrgMember);
  // Step 6: Create a project as member1 (owner has project:manage permission)
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {},
  );
  typia.assert(project);
  // Step 7: Assign member2 to the project as project-lead
  const member2ProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      member1Connection,
      {
        body: {
          organizationMemberId: member2OrgMember.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(member2ProjectMember);
  // Step 8: Assign member1 to the project as member (so they can be used as assignee)
  const member1ProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      member1Connection,
      {
        body: {
          organizationMemberId: member1OrgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(member1ProjectMember);
  // Step 9: Create a task in the project as member1 (with no assignee, status='open')
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // Test execution: member2 (project lead) updates the task
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    member2Connection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        title: updatedTitle,
        priority: "urgent",
        estimated_hours: 16,
        assignee_id: member1OrgMember.id,
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Validate updated fields
  TestValidator.equals("task title updated", updatedTask.title, updatedTitle);
  TestValidator.equals(
    "task priority updated to urgent",
    updatedTask.priority,
    "urgent",
  );
  TestValidator.equals(
    "task estimatedHours updated to 16",
    updatedTask.estimatedHours,
    16,
  );
  // Validate assignee is member1 org member
  TestValidator.predicate(
    "task assignee is set",
    updatedTask.assignee !== null,
  );
  if (updatedTask.assignee !== null) {
    TestValidator.equals(
      "task assignee is member1 org member",
      updatedTask.assignee.id,
      member1OrgMember.id,
    );
  }
  // Validate task histories include status change from 'open' to 'in-progress'
  TestValidator.predicate(
    "taskHistories has at least one entry",
    updatedTask.taskHistories.length > 0,
  );
  const statusHistory = updatedTask.taskHistories.find(
    (h) => h.newStatus === "in-progress",
  );
  TestValidator.predicate(
    "statusHistory with in-progress found",
    statusHistory !== undefined,
  );
  if (statusHistory !== undefined) {
    TestValidator.equals(
      "history recorder is member2 org member",
      statusHistory.recorder.id,
      member2OrgMember.id,
    );
  }
}
