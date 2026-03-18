import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate project lead
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadResult = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(projectLeadResult);
  // 2. Extract organization info
  const organizationId =
    projectLeadResult.organization_memberships[0].organization.id;
  const organizationRoleId =
    projectLeadResult.organization_memberships[0].organizationRole.id;
  // 3. Register and authenticate second member (task assignee)
  const taskAssigneeConnection: api.IConnection = { host: connection.host };
  const taskAssigneeResult = await authorize_member_join(
    taskAssigneeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(taskAssigneeResult);
  // 4. Add second member to organization using project lead's connection
  const projectLeadMemberConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(projectLeadMemberConnection, {
    body: {
      email: projectLeadResult.email,
      password: projectLeadResult.token.access,
    },
  });
  const organizationMember =
    await api.functional.hrms.member.organization_members.create(
      projectLeadMemberConnection,
      {
        body: {
          hrms_member_id: taskAssigneeResult.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: organizationRoleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 5. Create project
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      projectLeadMemberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // Extract project ID immediately after assertion
  const projectId = (
    project as unknown as {
      id: string;
    }
  ).id;
  // 6. Add project lead to project as project-lead
  const projectLeadProjectMember =
    await api.functional.hrms.member.projects.members.addMember(
      projectLeadMemberConnection,
      {
        projectId,
        body: {
          employee_id: projectLeadResult.id,
          role: "project-lead" as const,
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadProjectMember);
  // 7. Add second member (task assignee) to project as member
  const taskAssigneeProjectMember =
    await api.functional.hrms.member.projects.members.addMember(
      projectLeadMemberConnection,
      {
        projectId,
        body: {
          employee_id: taskAssigneeResult.id,
          role: "member" as const,
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(taskAssigneeProjectMember);
  // 8. Create task assigned to second member
  const task = await api.functional.hrms.member.projects.tasks.create(
    projectLeadMemberConnection,
    {
      projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open" as const,
        priority: "medium" as const,
        hrms_employee_id: taskAssigneeResult.id,
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IHrmsTask.ICreate,
    },
  );
  typia.assert(task);
  // Extract task info immediately after assertion
  const taskEntity = task as unknown as {
    id: string;
    status: string;
    description: string | null | undefined;
    updated_at: string;
  };
  const taskId = taskEntity.id;
  const previousStatus = taskEntity.status;
  const previousDescription = taskEntity.description;
  const previousUpdatedAt = taskEntity.updated_at;
  // 9. Update task as project lead (change status and description)
  const updatedTask = await api.functional.hrms.member.tasks.update(
    projectLeadMemberConnection,
    {
      taskId,
      body: {
        status: "in-progress" as const,
        description: `${previousDescription || ""} - Updated by project lead`,
      } satisfies IHrmsTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Extract updated task info
  const updatedTaskEntity = updatedTask as unknown as {
    id: string;
    status: string;
    description: string | null | undefined;
    updated_at: string;
    project_id: string;
  };
  const updatedStatus = updatedTaskEntity.status;
  const updatedDescription = updatedTaskEntity.description;
  const updatedUpdatedAt = updatedTaskEntity.updated_at;
  const updatedTaskId = updatedTaskEntity.id;
  const updatedProjectId = updatedTaskEntity.project_id;
  // 10. Validate task update
  TestValidator.equals(
    "status updated to in-progress",
    updatedStatus,
    "in-progress",
  );
  TestValidator.notEquals(
    "status changed from open",
    previousStatus,
    updatedStatus,
  );
  TestValidator.equals(
    "description updated",
    updatedDescription,
    `${previousDescription || ""} - Updated by project lead`,
  );
  TestValidator.notEquals(
    "updated_at changed",
    previousUpdatedAt,
    updatedUpdatedAt,
  );
  TestValidator.equals("task ID unchanged", updatedTaskId, taskId);
  TestValidator.equals("project_id unchanged", updatedProjectId, projectId);
}
