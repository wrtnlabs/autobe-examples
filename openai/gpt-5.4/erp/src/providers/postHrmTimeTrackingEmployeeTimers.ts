import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimerCollector } from "../collectors/HrmTimeTrackingTimerCollector";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimerTransformer } from "../transformers/HrmTimeTrackingTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimers(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimer.ICreate;
}): Promise<IHrmTimeTrackingTimer> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findUniqueOrThrow(
      {
        where: { id: props.employee.session_id },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          hrm_time_tracking_organization_id: true,
        },
      },
    );
  if (session.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId =
    session.hrm_time_tracking_organization_id satisfies string as string;
  await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.body.hrm_time_tracking_project_id,
      hrm_time_tracking_organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (
    props.body.hrm_time_tracking_task_id !== undefined &&
    props.body.hrm_time_tracking_task_id !== null
  ) {
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.body.hrm_time_tracking_task_id,
        hrm_time_tracking_project_id: props.body.hrm_time_tracking_project_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const existing = await tx.hrm_time_tracking_timers.findUnique({
        where: {
          hrm_time_tracking_employee_id: props.employee.id,
        },
        select: {
          id: true,
          deleted_at: true,
        },
      });
      if (existing !== null && existing.deleted_at === null) {
        throw new HttpException("An active timer already exists.", 409);
      }
      return await tx.hrm_time_tracking_timers.create({
        data: await HrmTimeTrackingTimerCollector.collect({
          body: props.body,
          hrmTimeTrackingEmployees: {
            id: props.employee.id,
          },
          hrmTimeTrackingOrganizations: {
            id: organizationId,
          },
        }),
        ...HrmTimeTrackingTimerTransformer.select(),
      });
    });
    return await HrmTimeTrackingTimerTransformer.transform(created);
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("An active timer already exists.", 409);
    }
    throw error;
  }
}
