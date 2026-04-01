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
  // Validate project exists and is not deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId, deleted_at: null },
    },
  );
  // Check authorization: user must have project:manage permission OR be a project lead
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 403);
  }
  // Check if user has project:manage permission via role
  const hasProjectManagePermission = employee.role.rolePermissions.some(
    (p) => p.permission === "project:manage",
  );
  // Check if user is a project lead in this project
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  const isProjectLead = projectMembership?.role === "project-lead";
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException(
      "Forbidden: Requires project:manage permission or project-lead role",
      403,
    );
  }
  // Validate assignee if provided - must be a member of this project
  if (props.body.hrm_platform_employee_id) {
    const assigneeMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_project_id: props.projectId,
          hrm_platform_employee_id: props.body.hrm_platform_employee_id,
          deleted_at: null,
        },
      });
    if (!assigneeMembership) {
      throw new HttpException("Assignee must be a member of this project", 400);
    }
  }
  // Validate parent_task_id if provided - must belong to same project and not be a subtask
  if (props.body.parent_task_id) {
    const parentTask =
      await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.parent_task_id, deleted_at: null },
        select: {
          hrm_platform_project_id: true,
          parent_task_id: true,
        },
      });
    if (parentTask.hrm_platform_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_task_id !== null) {
      throw new HttpException(
        "Cannot create subtask of a subtask (one-level nesting only)",
        400,
      );
    }
  }
  // Validate status enum
  const validStatuses = ["open", "in-progress", "completed", "closed"];
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );
  }
  // Validate priority enum
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (!validPriorities.includes(props.body.priority)) {
    throw new HttpException(
      `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
      400,
    );
  }
  // Validate estimated_hours is positive if provided
  if (
    props.body.estimated_hours !== undefined &&
    props.body.estimated_hours !== null
  ) {
    if (props.body.estimated_hours <= 0) {
      throw new HttpException("Estimated hours must be positive", 400);
    }
  }
  // Validate due_date is in the future if provided
  if (props.body.due_date !== undefined && props.body.due_date !== null) {
    const dueDate = new Date(props.body.due_date);
    const now = new Date();
    if (dueDate <= now) {
      throw new HttpException("Due date must be in the future", 400);
    }
  }
  // Create task using collector
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  // Transform and return
  return await HrmPlatformTaskTransformer.transform(created);
}
