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
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimerTransformer } from "../transformers/HrmTimeTrackingTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingEmployeeTimersTimerId(props: {
  employee: EmployeePayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimer.IUpdate;
}): Promise<IHrmTimeTrackingTimer> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findFirstOrThrow({
      where: {
        id: props.employee.session_id,
        hrm_time_tracking_employee_id: props.employee.id,
        logged_out_at: null,
      },
      select: {
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException(
      "Employee session is not connected to an organization",
      400,
    );
  }
  const organizationId = session.hrm_time_tracking_organization_id;
  const timer = await MyGlobal.prisma.hrm_time_tracking_timers.findFirstOrThrow(
    {
      where: {
        id: props.timerId,
        hrm_time_tracking_employee_id: props.employee.id,
        hrm_time_tracking_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_task_id: true,
      },
    },
  );
  const nextProjectId =
    props.body.project_id ?? timer.hrm_time_tracking_project_id;
  if (props.body.project_id !== undefined && props.body.project_id !== null) {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        hrm_time_tracking_organization_id: organizationId,
      },
      select: {
        id: true,
      },
    });
  }
  if (props.body.task_id === undefined) {
    if (
      props.body.project_id !== undefined &&
      props.body.project_id !== null &&
      timer.hrm_time_tracking_task_id !== null
    ) {
      const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
        where: {
          id: timer.hrm_time_tracking_task_id,
          hrm_time_tracking_project_id: props.body.project_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (task === null) {
        throw new HttpException(
          "Referenced task does not belong to the selected project",
          400,
        );
      }
    }
  } else if (props.body.task_id !== null) {
    if (nextProjectId === null) {
      throw new HttpException(
        "A project must be selected when assigning a task",
        400,
      );
    }
    const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow(
      {
        where: {
          id: props.body.task_id,
          hrm_time_tracking_project_id: nextProjectId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
    if (task.id !== props.body.task_id) {
      throw new HttpException(
        "Referenced task does not belong to the selected project",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_time_tracking_timers.update({
    where: {
      id: timer.id,
    },
    data: {
      hrm_time_tracking_project_id: nextProjectId,
      hrm_time_tracking_task_id:
        props.body.task_id === undefined
          ? timer.hrm_time_tracking_task_id
          : props.body.task_id,
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      updated_at: toISOStringSafe("2026-03-15T19:24:00.413Z"),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timers.findUniqueOrThrow({
      where: {
        id: timer.id,
      },
      ...HrmTimeTrackingTimerTransformer.select(),
    });
  return await HrmTimeTrackingTimerTransformer.transform(updated);
}
