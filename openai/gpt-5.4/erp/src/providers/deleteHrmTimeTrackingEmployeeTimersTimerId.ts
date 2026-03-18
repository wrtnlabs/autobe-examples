import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingEmployeeTimersTimerId(props: {
  employee: EmployeePayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findUniqueOrThrow(
      {
        where: {
          id: props.employee.session_id,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          hrm_time_tracking_employee_id: true,
        },
      },
    );
  if (session.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const timer =
    await MyGlobal.prisma.hrm_time_tracking_timers.findUniqueOrThrow({
      where: {
        id: props.timerId,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_task_id: true,
        started_at: true,
        deleted_at: true,
      },
    });
  if (timer.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    timer.hrm_time_tracking_organization_id !==
    session.hrm_time_tracking_organization_id
  ) {
    throw new HttpException("Not Found", 404);
  }
  if (timer.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    await MyGlobal.prisma.hrm_time_tracking_timers.delete({
      where: {
        id: props.timerId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Conflict", 409);
    }
    throw error;
  }
}
