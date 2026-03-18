import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsTaskCollector } from "../collectors/HrmsTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsTask.ICreate;
}): Promise<IHrmsTask.ICreate> {
  // 1. Verify project exists and belongs to current organization context
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  // 2. Validate user has project management permission or is project lead
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!projectMembership) {
    throw new HttpException("Not a project member", 403);
  }
  const hasManagePermission = projectMembership.role === "project:manage";
  const isProjectLead = projectMembership.role === "project-lead";
  if (!hasManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate assigned employee is a project member if provided
  if (props.body.hrms_employee_id !== null) {
    const employeeAssignment =
      await MyGlobal.prisma.hrms_project_members.findFirst({
        where: {
          project_id: props.projectId,
          employee_id: props.body.hrms_employee_id,
          deleted_at: null,
        },
      });
    if (!employeeAssignment) {
      throw new HttpException("Employee is not a project member", 400);
    }
  }
  // 4. Create task using collector
  const created = await MyGlobal.prisma.hrms_tasks.create({
    data: await HrmsTaskCollector.collect({
      body: props.body,
      hrmsProjects: project,
    }),
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 5. Return task with proper DTO format (only ICreate fields)
  const task: IHrmsTask.ICreate = {
    title: created.title,
    description: created.description !== null ? created.description : undefined,
    status: created.status as "open" | "in-progress" | "completed" | "closed",
    priority: created.priority as "low" | "medium" | "high" | "urgent",
    estimated_hours:
      created.estimated_hours !== null ? created.estimated_hours : undefined,
    due_date:
      created.due_date !== null ? toISOStringSafe(created.due_date) : undefined,
    billable: created.billable !== null ? created.billable : undefined,
    hrms_employee_id:
      created.hrms_employee_id !== null
        ? (created.hrms_employee_id as string & tags.Format<"uuid">)
        : undefined,
  };
  return task;
}
