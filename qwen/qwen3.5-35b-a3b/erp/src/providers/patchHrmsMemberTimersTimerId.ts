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
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      hrms_employee_id: true,
      hrms_project_id: true,
      hrms_task_id: true,
      start_at: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: { select: { id: true, status: true } },
    },
  });
  if (timer.hrms_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timer.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: timer.hrms_employee_id },
    select: { id: true, status: true },
  });
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 400);
  }
  const targetProjectId =
    props.body.hrms_project_id !== undefined
      ? props.body.hrms_project_id
      : timer.hrms_project_id;
  if (props.body.hrms_project_id !== undefined) {
    const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: props.member.id,
        project_id: props.body.hrms_project_id,
      },
      select: { id: true },
    });
    if (projectMember === null) {
      throw new HttpException("Employee is not assigned to this project", 400);
    }
  }
  if (
    props.body.hrms_task_id !== undefined &&
    props.body.hrms_task_id !== null
  ) {
    const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
      where: { id: props.body.hrms_task_id },
      select: { id: true, hrms_project_id: true },
    });
    if (task.hrms_project_id !== targetProjectId) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  const updateData: Prisma.hrms_timersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.hrms_project_id !== undefined) {
    updateData.project = { connect: { id: props.body.hrms_project_id } };
  }
  if (
    props.body.hrms_task_id !== undefined &&
    props.body.hrms_task_id !== null
  ) {
    updateData.task = { connect: { id: props.body.hrms_task_id } };
  }
  const updatedTimer = await MyGlobal.prisma.hrms_timers.update({
    where: { id: props.timerId },
    data: updateData,
    ...HrmsTimerTransformer.select(),
  });
  return await HrmsTimerTransformer.transform(updatedTimer);
}
