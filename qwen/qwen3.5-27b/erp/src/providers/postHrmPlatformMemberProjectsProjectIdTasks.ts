import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTaskCollector } from "../collectors/HrmPlatformTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask> {
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, organization_id: true },
    },
  );
  // Verify member has employee record in the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify member has project-lead role in this project
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        role: "project-lead",
        deleted_at: null,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate assigned employee if provided
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    const assignedEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          id: props.body.assigned_employee_id,
          organization_id: project.organization_id,
          deleted_at: null,
          status: "active",
        },
        select: { id: true },
      });
    if (assignedEmployee === null) {
      throw new HttpException("Invalid assigned employee", 400);
    }
    // Verify assigned employee is a member of the project
    const assignedProjectMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: props.body.assigned_employee_id,
          hrm_platform_project_id: props.projectId,
          deleted_at: null,
        },
      });
    if (assignedProjectMembership === null) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        400,
      );
    }
  }
  // Validate parent task if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask =
      await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.parent_task_id },
        select: {
          id: true,
          hrm_platform_project_id: true,
          parent_task_id: true,
        },
      });
    // Verify parent task is in the same project
    if (parentTask.hrm_platform_project_id !== props.projectId) {
      throw new HttpException("Parent task must be in the same project", 400);
    }
    // Verify parent task is not itself a subtask
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Parent task cannot be a subtask", 400);
    }
  }
  // Create the task using collector and transformer
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
      hrmPlatformMembers: { id: props.member.id },
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(created);
}
