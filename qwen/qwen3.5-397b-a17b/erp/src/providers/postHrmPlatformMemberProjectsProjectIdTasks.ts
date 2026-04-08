import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    },
  );
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: project.organization_id,
      },
    });
  if (!membership) {
    throw new HttpException("Not a member of this organization", 403);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Not an employee of this organization", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
      },
      select: {
        hrm_platform_permission_id: true,
      },
    });
  const permissionIds = rolePermissions.map(
    (rp) => rp.hrm_platform_permission_id,
  );
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      id: { in: permissionIds },
    },
    select: {
      id: true,
      code: true,
    },
  });
  const hasProjectManage = permissions.some((p) => p.code === "project:manage");
  const projectLeadMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        role: "project-lead",
      },
    });
  if (!hasProjectManage && !projectLeadMembership) {
    throw new HttpException(
      "Forbidden: Must have project:manage permission or be project-lead",
      403,
    );
  }
  if (props.body.assigned_employee_id) {
    const assignedEmployeeMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_employee_id: props.body.assigned_employee_id,
          hrm_platform_project_id: props.projectId,
        },
      });
    if (!assignedEmployeeMembership) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  if (props.body.parent_task_id) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: {
        id: props.body.parent_task_id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_task_id: true,
      },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found in this project", 400);
    }
    if (parentTask.parent_task_id) {
      throw new HttpException(
        "Cannot create subtask of a subtask - only one level nesting allowed",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: project.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "task:created",
      target_entity_type: "task",
      target_entity_id: record.id,
      details: JSON.stringify({
        title: record.title,
        project_id: props.projectId,
      }),
      created_at: new Date(),
    },
  });
  return await HrmPlatformTaskTransformer.transform(record);
}
