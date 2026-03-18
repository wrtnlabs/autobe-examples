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

export async function test_api_task_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member (project lead)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const organizationId =
    memberAuthorized.organization_memberships[0].organization.id;
  // 2. Create two organization members (employees)
  const employeeConnection1: api.IConnection = { host: connection.host };
  const employeeAuthorized1 = await authorize_member_join(employeeConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuthorized1);
  const employeeConnection2: api.IConnection = { host: connection.host };
  const employeeAuthorized2 = await authorize_member_join(employeeConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuthorized2);
  // Create organization memberships for both employees
  const organizationRole =
    memberAuthorized.organization_memberships[0].organizationRole.id;
  await generate_random_hrms_member_organization_members_create(
    memberConnection,
    {
      body: {
        hrms_member_id: employeeAuthorized1.id,
        hrms_organization_id: organizationId,
        hrms_organization_role_id: organizationRole,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  await generate_random_hrms_member_organization_members_create(
    memberConnection,
    {
      body: {
        hrms_member_id: employeeAuthorized2.id,
        hrms_organization_id: organizationId,
        hrms_organization_role_id: organizationRole,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // 3. Create project
  const project =
    (await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
          description: "Test project for task update",
          budget_hours: 100,
        } satisfies IHrmsProject.ICreate,
        params: { organizationId },
      },
    )) as IHrmsProject & {
      id: string & tags.Format<"uuid">;
      name: string;
      description: string;
      color_code: string;
      organization_id: string & tags.Format<"uuid">;
      status: "active" | "archived" | "completed";
    };
  typia.assert(project);
  // 4. Add employees to project
  await generate_random_hrms_member_projects_members_add_member(
    memberConnection,
    {
      body: {
        employee_id: employeeAuthorized1.id,
        role: "project-lead",
      } satisfies IHrmsProjectMember.ICreate,
      params: { projectId: project.id },
    },
  );
  await generate_random_hrms_member_projects_members_add_member(
    memberConnection,
    {
      body: {
        employee_id: employeeAuthorized2.id,
        role: "member",
      } satisfies IHrmsProjectMember.ICreate,
      params: { projectId: project.id },
    },
  );
  // 5. Create task assigned to first employee
  const taskCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: "Initial task description",
    status: "open" as const,
    priority: "medium" as const,
    estimated_hours: 8,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    billable: true,
    hrms_employee_id: employeeAuthorized1.id,
  } satisfies IHrmsTask.ICreate;
  const taskResponse = (await generate_random_hrms_member_projects_tasks_create(
    memberConnection,
    {
      body: taskCreateData,
      params: { projectId: project.id },
    },
  )) as IHrmsTask & {
    id: string & tags.Format<"uuid">;
    title: string;
    description: string | null;
    status: "open" | "in-progress" | "completed" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    estimated_hours: number | null;
    due_date: (string & tags.Format<"date-time">) | null;
    billable: boolean | null;
    hrms_employee_id: (string & tags.Format<"uuid">) | null;
  };
  typia.assert(taskResponse);
  // 6. Update task with multiple fields
  const newDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const taskUpdateData = {
    priority: "high" as const,
    estimated_hours: 16,
    due_date: newDueDate,
    billable: false,
  } satisfies IHrmsTask.IUpdate;
  const updatedTaskResponse = await api.functional.hrms.member.tasks.update(
    memberConnection,
    {
      taskId: taskResponse.id,
      body: taskUpdateData,
    },
  );
  typia.assert(updatedTaskResponse);
}
