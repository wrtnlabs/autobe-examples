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

export async function postErpHrmMemberTimersTimerIdStop(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  // Get the employee record for the authenticated member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Check if employee is deactivated
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 403);
  }
  // Find the timer
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      erp_hrm_task_id: true,
      started_at: true,
      description: true,
      deleted_at: true,
    },
  });
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  // Verify ownership
  if (timer.erp_hrm_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if already stopped/discarded
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer is not active", 400);
  }
  // Calculate duration (in minutes, rounded to nearest minute)
  const now = new Date();
  const elapsedMs = now.getTime() - timer.started_at.getTime();
  const duration = Math.round(elapsedMs / 60000);
  const timelogId = v4();
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_timelogs.create({
      data: {
        id: timelogId,
        employee_id: timer.erp_hrm_employee_id,
        project_id: timer.erp_hrm_project_id,
        task_id: timer.erp_hrm_task_id,
        date: timer.started_at,
        duration,
        description: timer.description,
        billable: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.erp_hrm_timers.update({
      where: { id: props.timerId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
  ]);
  // Fetch the created timelog with full relations
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return ErpHrmTimelogTransformer.transform(timelog);
}
