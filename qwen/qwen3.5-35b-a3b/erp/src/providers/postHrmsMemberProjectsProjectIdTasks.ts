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

export async function postHrmsMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsTask.ICreate;
}): Promise<IHrmsTask> {
  // 1. Validate projectId exists
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, hrms_organization_id: true },
  });
  // 2. Verify user is member of project (member or project-lead role)
  const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee: {
        organizationMember: {
          hrms_member_id: props.member.id,
          deleted_at: null,
        },
      },
    },
    select: { role: true },
  });
  if (
    projectMember === null ||
    (projectMember.role !== "member" && projectMember.role !== "project-lead")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate parent task (if provided, must exist and belong to same project)
  let hrmsTaskId: (string & tags.Format<"uuid">) | null = null;
  if (
    props.body.hrms_task_id !== undefined &&
    props.body.hrms_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrms_tasks.findUnique({
      where: {
        id: props.body.hrms_task_id,
        hrms_project_id: props.projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (parentTask === null) {
      throw new HttpException(
        "Parent task not found or does not belong to this project",
        400,
      );
    }
    hrmsTaskId = props.body.hrms_task_id;
  }
  // 4. Prepare create data
  const createData: IHrmsTask.ICreate = {
    title: props.body.title,
    description: props.body.description,
    status: props.body.status ?? "open",
    priority: props.body.priority ?? "medium",
    estimated_hours: props.body.estimated_hours,
    due_date: props.body.due_date,
    billable: props.body.billable,
    hrms_employee_id: props.body.hrms_employee_id ?? undefined,
    hrms_task_id: hrmsTaskId ?? undefined,
  };
  // 5. Create task
  const task = await MyGlobal.prisma.hrms_tasks.create({
    data: await HrmsTaskCollector.collect({
      body: createData,
      hrmsProjects: {
        id: project.id,
      },
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
  // 6. Insert task_status_history record
  await MyGlobal.prisma.hrms_task_status_histories.create({
    data: {
      id: v4(),
      hrms_task_id: task.id,
      hrms_member_id: props.member.id,
      old_status: "",
      new_status: task.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 7. Log activity
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: project.hrms_organization_id,
      performed_by_id: props.member.id,
      action_type: "task.status_changed",
      target_entity: "task",
      target_id: task.id,
      details: JSON.stringify({ title: task.title }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 8. Return response
  return {
    id: task.id as string & tags.Format<"uuid">,
    project_id: task.hrms_project_id as string & tags.Format<"uuid">,
    hrms_employee_id: task.hrms_employee_id as
      | (string & tags.Format<"uuid">)
      | null,
    hrms_task_id: task.hrms_task_id as (string & tags.Format<"uuid">) | null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours,
    due_date: task.due_date !== null ? toISOStringSafe(task.due_date) : null,
    billable: task.billable,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at:
      task.deleted_at !== null ? toISOStringSafe(task.deleted_at) : null,
  } as unknown as IHrmsTask;
}
