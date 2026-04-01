import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimerTransformer } from "../transformers/HrmsTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmsTimer.IUpdate;
}): Promise<IHrmsTimer> {
  // Step 1: Fetch timer for validation
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      hrms_employee_id: true,
      hrms_project_id: true,
      hrms_task_id: true,
      start_at: true,
      description: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      employee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          department_id: true,
          status: true,
        },
      },
      project: {
        select: {
          id: true,
        },
      },
    },
  });
  // Step 2: Validate timer exists (already handled by findUniqueOrThrow)
  // Step 3: Validate soft delete
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer not found", 404);
  }
  // Step 4: Validate ownership
  if (timer.hrms_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Validate employee is active
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: timer.hrms_employee_id },
  });
  if (employee.status !== "active") {
    throw new HttpException("Employee has been deactivated", 400);
  }
  // Step 6: Validate project assignment (if changing)
  const newProjectId = props.body.hrms_project_id;
  if (newProjectId !== undefined && newProjectId !== null) {
    const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: timer.hrms_employee_id,
        project_id: newProjectId,
      },
    });
    if (!projectMember) {
      throw new HttpException("Employee is not assigned to the project", 400);
    }
  }
  // Step 7: Validate task belongs to project (if changing)
  const newTaskId = props.body.hrms_task_id;
  if (newTaskId !== undefined && newTaskId !== null) {
    const projectId = newProjectId ?? timer.hrms_project_id ?? undefined;
    const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
      where: { id: newTaskId },
    });
    if (task.hrms_project_id !== projectId) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Step 8: Execute update
  const updateData: Prisma.hrms_timersUpdateInput = {};
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (
    props.body.hrms_project_id !== undefined &&
    props.body.hrms_project_id !== null
  ) {
    updateData.project = { connect: { id: props.body.hrms_project_id } };
  }
  if (
    props.body.hrms_task_id !== undefined &&
    props.body.hrms_task_id !== null
  ) {
    updateData.task = { connect: { id: props.body.hrms_task_id } };
  }
  updateData.updated_at = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrms_timers.update({
    where: { id: props.timerId },
    data: updateData,
  });
  // Step 9: Fetch updated timer with full relations
  const fullTimer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...HrmsTimerTransformer.select(),
  });
  // Step 10: Transform response
  return await HrmsTimerTransformer.transform(fullTimer);
}
