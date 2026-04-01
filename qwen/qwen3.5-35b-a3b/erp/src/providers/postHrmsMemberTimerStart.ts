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

export async function postHrmsMemberTimerStart(props: {
  member: MemberPayload;
  body: IHrmsTimer.ICreate;
}): Promise<IHrmsTimer> {
  // Step 1: Find employee record linked to this member
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organizationMember: {
        id: props.member.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 403);
  }
  // Step 2: Validate project assignment - check if employee is assigned to the selected project
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: employee.id,
        project_id: props.body.project_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "Employee is not assigned to the selected project",
      403,
    );
  }
  // Step 3: Check for existing active timer (one active timer per employee limit)
  const existingTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException(
      "Employee already has an active timer running",
      409,
    );
  }
  // Step 4: Validate task belongs to selected project if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrms_tasks.findFirst({
      where: {
        id: props.body.task_id,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.hrms_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Step 5: Create the timer using collector for proper data transformation
  const createdTimer = await MyGlobal.prisma.hrms_timers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrms_employee_id: employee.id,
      hrms_project_id: props.body.project_id,
      hrms_task_id: props.body.task_id ?? null,
      description: props.body.description ?? null,
      start_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Step 6: Query with transformer select and transform
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: { id: createdTimer.id },
    ...HrmsTimerTransformer.select(),
  });
  return await HrmsTimerTransformer.transform(timer);
}
