import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // 1. Load timelog with employee and project relations
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          status: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (!timelog || timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 2. Verify employee is active
  if (timelog.employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 400);
  }
  // 3. Check if timelog is part of an approved timesheet
  const timesheetTimelog =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
      where: { timelog_id: props.timelogId },
      select: {
        timesheet: {
          select: { status: true },
        },
      },
    });
  if (timesheetTimelog && timesheetTimelog.timesheet.status === "approved") {
    throw new HttpException("Cannot modify timelog in approved timesheet", 400);
  }
  // 4. Authorization check
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: timelog.employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  const isOwner = memberEmployee && memberEmployee.id === timelog.employee_id;
  if (!isOwner) {
    if (!memberEmployee) {
      throw new HttpException("Forbidden", 403);
    }
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
          permission: "time:manage",
        },
      },
    );
    if (!permission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 5. Project validation (if updating)
  const newProjectId = props.body.projectId ?? timelog.project_id;
  if (props.body.projectId !== undefined) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: { id: props.body.projectId },
      select: { status: true },
    });
    if (!project || project.status !== "active") {
      throw new HttpException("Project not found or not active", 400);
    }
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: timelog.employee_id,
          erp_hrm_project_id: props.body.projectId,
          deleted_at: null,
        },
      });
    if (!projectMembership) {
      throw new HttpException("Employee not assigned to project", 400);
    }
  }
  // 6. Task validation (if updating)
  const newTaskId =
    props.body.taskId !== undefined ? props.body.taskId : timelog.task_id;
  if (newTaskId !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: newTaskId },
      select: { project_id: true },
    });
    if (!task || task.project_id !== newProjectId) {
      throw new HttpException("Task not found or not in project", 400);
    }
  }
  // 7. Perform update
  const updated = await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.projectId !== undefined && {
        project: { connect: { id: props.body.projectId } },
      }),
      ...(props.body.taskId !== undefined && {
        task:
          props.body.taskId === null
            ? { disconnect: true }
            : { connect: { id: props.body.taskId } },
      }),
      ...(props.body.date !== undefined && { date: new Date(props.body.date) }),
      ...(props.body.duration !== undefined && {
        duration: props.body.duration,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      updated_at: new Date(),
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  // 8. Return response
  return await ErpHrmTimelogTransformer.transform(updated);
}
