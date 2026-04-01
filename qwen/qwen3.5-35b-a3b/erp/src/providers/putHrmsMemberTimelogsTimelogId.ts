import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmsTimelog.IUpdate;
}): Promise<IHrmsTimelog> {
  const timelog = await MyGlobal.prisma.hrms_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      billable: true,
      created_at: true,
      date: true,
      description: true,
      duration_minutes: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: { id: true },
      },
    },
  });
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog has already been deleted", 409);
  }
  if (timelog.employee.id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own timelogs",
      403,
    );
  }
  if (props.body.project_id !== undefined) {
    const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: props.member.id,
        project_id: props.body.project_id,
        deleted_at: null,
      },
    });
    if (projectMember === null) {
      throw new HttpException(
        "Employee is not assigned to the specified project",
        400,
      );
    }
  }
  if (props.body.task_id !== undefined) {
    if (props.body.task_id !== null) {
      const targetProjectId = props.body.project_id ?? timelog.project_id;
      const task = await MyGlobal.prisma.hrms_tasks.findFirst({
        where: {
          id: props.body.task_id,
          project: {
            id: targetProjectId,
          },
        },
      });
      if (task === null) {
        throw new HttpException(
          "Task not found or does not belong to the specified project",
          400,
        );
      }
    }
  }
  if (props.body.duration_minutes !== undefined) {
    if (props.body.duration_minutes <= 0) {
      throw new HttpException("Duration must be a positive integer", 400);
    }
  }
  if (props.body.date !== undefined) {
    if (props.body.date !== null) {
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!datePattern.test(props.body.date)) {
        throw new HttpException("Invalid date format", 400);
      }
    }
  }
  const updateData: Prisma.hrms_timelogsUncheckedUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.duration_minutes !== undefined) {
    updateData.duration_minutes = props.body.duration_minutes;
  }
  if (props.body.project_id !== undefined) {
    updateData.project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    updateData.task_id = props.body.task_id;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  if (props.body.date !== undefined && props.body.date !== null) {
    updateData.date = new Date(props.body.date);
  }
  const updatedTimelog = await MyGlobal.prisma.hrms_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  return typia.random<IHrmsTimelog>();
}
