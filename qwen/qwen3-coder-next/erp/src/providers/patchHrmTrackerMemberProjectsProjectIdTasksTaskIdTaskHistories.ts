import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerEmployeeAtSummaryTransformer } from "../transformers/HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerProjectAtSummaryTransformer } from "../transformers/HrmTrackerProjectAtSummaryTransformer";
import { HrmTrackerTaskAtSummaryTransformer } from "../transformers/HrmTrackerTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberProjectsProjectIdTasksTaskIdTaskHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTrackerTask.IUpdate;
}): Promise<IHrmTrackerTask> {
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      organization: true,
      status: true,
    },
  });
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  const task = await MyGlobal.prisma.hrm_tracker_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      status: true,
      project: true,
    },
  });
  if (task.project.id !== props.projectId) {
    throw new HttpException("Task does not belong to project", 404);
  }
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: { user_id: props.member.id, deleted_at: null },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const isProjectLead =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
      where: {
        project: { id: props.projectId },
        employee: { id: employee.id },
        role: "project-lead",
      },
    });
  const hasProjectManagePermission =
    await MyGlobal.prisma.hrm_tracker_role_permissions.findFirst({
      where: {
        role: { id: employee.role_id !== null ? employee.role_id : undefined },
        permission: { permission: "project:manage" },
      },
    });
  if (!isProjectLead && !hasProjectManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  const allowedStatuses: ["open", "in-progress", "completed", "closed"] = [
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  const newStatus = props.body.status
    ? (allowedStatuses.find((s) => s === props.body.status) ?? "open")
    : task.status;
  const currentStatus = task.status;
  let updatedTask;
  if (currentStatus !== newStatus) {
    updatedTask = await MyGlobal.prisma.hrm_tracker_tasks.update({
      where: { id: props.taskId },
      data: {
        status: newStatus,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      select: {
        id: true,
        project_id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        assignedEmployee: { select: { id: true } },
        parentTask: { select: { id: true } },
      },
    });
    await MyGlobal.prisma.hrm_tracker_task_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: props.taskId,
        old_status: currentStatus,
        new_status: newStatus,
        employee_id: employee.id,
        organization_id: project.organization?.id ?? "",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        changed_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  } else {
    updatedTask = await MyGlobal.prisma.hrm_tracker_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      select: {
        id: true,
        project_id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        assignedEmployee: { select: { id: true } },
        parentTask: { select: { id: true } },
      },
    });
  }
  const result = {
    id: updatedTask.id,
    project: await HrmTrackerProjectAtSummaryTransformer.transform(
      await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
        where: { id: updatedTask.project_id },
        ...HrmTrackerProjectAtSummaryTransformer.select(),
      }),
    ),
    assigned_employee: updatedTask.assignedEmployee
      ? await HrmTrackerEmployeeAtSummaryTransformer.transform(
          await MyGlobal.prisma.hrm_tracker_employees.findUniqueOrThrow({
            where: { id: updatedTask.assignedEmployee.id },
            ...HrmTrackerEmployeeAtSummaryTransformer.select(),
          }),
        )
      : null,
    parent_task: updatedTask.parentTask
      ? await HrmTrackerTaskAtSummaryTransformer.transform(
          await MyGlobal.prisma.hrm_tracker_tasks.findUniqueOrThrow({
            where: { id: updatedTask.parentTask.id },
            ...HrmTrackerTaskAtSummaryTransformer.select(),
          }),
        )
      : null,
    title: updatedTask.title,
    description: updatedTask.description ?? undefined,
    status: typia.assert<"open" | "in-progress" | "completed" | "closed">(
      updatedTask.status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | "urgent">(
      updatedTask.priority,
    ),
    estimated_hours: updatedTask.estimated_hours ?? undefined,
    due_date: updatedTask.due_date
      ? toISOStringSafe(updatedTask.due_date)
      : null,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    deleted_at: updatedTask.deleted_at
      ? toISOStringSafe(updatedTask.deleted_at)
      : null,
  } satisfies IHrmTrackerTask;
  return result;
}
