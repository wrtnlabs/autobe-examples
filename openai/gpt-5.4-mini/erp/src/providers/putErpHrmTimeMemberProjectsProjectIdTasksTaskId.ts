import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.IUpdate;
}): Promise<IErpHrmTimeTaskHistoryEntry> {
  const current = await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_time_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
      erp_hrm_time_employee_id: true,
      parent_task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      project: ErpHrmTimeProjectAtSummaryTransformer.select(),
      employee: ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
      parentTask: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
      subTasks: { select: {} },
    },
  });
  if (
    props.body.erp_hrm_time_employee_id !== undefined &&
    props.body.erp_hrm_time_employee_id !== null
  ) {
    const employee =
      await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
        where: {
          id: props.body.erp_hrm_time_employee_id,
        },
        select: {
          id: true,
        },
      });
    if (employee.id !== props.body.erp_hrm_time_employee_id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask =
      await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
        where: {
          id: props.body.parent_task_id,
          erp_hrm_time_project_id: props.projectId,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_task_id: true,
        },
      });
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Bad Request", 400);
    }
  }
  const nextStatus: string =
    props.body.status === undefined ? current.status : props.body.status;
  const nextDescription: string | null | undefined =
    props.body.description === undefined
      ? current.description
      : props.body.description;
  const nextDueDate: string | null | undefined =
    props.body.due_date === undefined
      ? current.due_date === null
        ? null
        : current.due_date.toISOString()
      : props.body.due_date;
  const nextUpdatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const hasChanges: boolean =
    (props.body.erp_hrm_time_employee_id !== undefined &&
      props.body.erp_hrm_time_employee_id !==
        current.erp_hrm_time_employee_id) ||
    (props.body.parent_task_id !== undefined &&
      props.body.parent_task_id !== current.parent_task_id) ||
    (props.body.title !== undefined && props.body.title !== current.title) ||
    (props.body.description !== undefined &&
      props.body.description !== current.description) ||
    (props.body.status !== undefined && props.body.status !== current.status) ||
    (props.body.priority !== undefined &&
      props.body.priority !== current.priority) ||
    (props.body.estimated_hours !== undefined &&
      props.body.estimated_hours !== current.estimated_hours) ||
    (props.body.due_date !== undefined &&
      ((props.body.due_date === null && current.due_date !== null) ||
        (props.body.due_date !== null && current.due_date === null) ||
        (props.body.due_date !== null &&
          current.due_date !== null &&
          props.body.due_date !== current.due_date.toISOString())));
  if (hasChanges === false) {
    return {
      id: current.id,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        current.project,
      ),
      employee:
        current.employee === null
          ? null
          : await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
              current.employee,
            ),
      parentTask:
        current.parentTask === null
          ? null
          : await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
              current.parentTask,
            ),
      title: current.title,
      description: current.description ?? null,
      status: current.status,
      priority: current.priority,
      estimatedHours:
        current.estimated_hours === null
          ? null
          : Number(current.estimated_hours),
      dueDate: current.due_date?.toISOString() ?? null,
      created_at: current.created_at.toISOString(),
      updated_at: current.updated_at.toISOString(),
      deleted_at: current.deleted_at?.toISOString() ?? null,
    };
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_tasks.update({
      where: {
        id: props.taskId,
      },
      data: {
        ...(props.body.erp_hrm_time_employee_id !== undefined && {
          erp_hrm_time_employee_id: props.body.erp_hrm_time_employee_id,
        }),
        ...(props.body.parent_task_id !== undefined && {
          parent_task_id: props.body.parent_task_id,
        }),
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.priority !== undefined && {
          priority: props.body.priority,
        }),
        ...(props.body.estimated_hours !== undefined && {
          estimated_hours: props.body.estimated_hours,
        }),
        ...(props.body.due_date !== undefined && {
          due_date:
            props.body.due_date === null ? null : new Date(props.body.due_date),
        }),
        updated_at: new Date(),
      },
    });
    const result = await prisma.erp_hrm_time_tasks.findUniqueOrThrow({
      where: {
        id: props.taskId,
      },
      select: {
        id: true,
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        parentTask: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return result;
  });
  return {
    id: updated.id,
    project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
      updated.project,
    ),
    employee:
      updated.employee === null
        ? null
        : await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
            updated.employee,
          ),
    parentTask:
      updated.parentTask === null
        ? null
        : await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
            updated.parentTask,
          ),
    title: updated.title,
    description: updated.description ?? null,
    status: updated.status,
    priority: updated.priority,
    estimatedHours:
      updated.estimated_hours === null ? null : Number(updated.estimated_hours),
    dueDate: updated.due_date?.toISOString() ?? null,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
